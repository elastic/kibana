/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { difference } from 'lodash';
import { readFile, writeFile } from 'fs/promises';
import type { ISavedObjectTypeRegistry, SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  getFieldListMapFromMappingDefinitions,
  FieldListMap,
  SavedObjectsTypeMappingDefinitions,
  getVersionAddedFields,
} from '@kbn/core-saved-objects-base-server-internal';
import { Root } from '@kbn/core-root-server-internal';
import { createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';

describe('checking added mappings on all registered SO types', () => {
  let root: Root;
  let typeRegistry: ISavedObjectTypeRegistry;

  beforeAll(async () => {
    root = createRootWithCorePlugins(
      {
        migrations: { skip: true },
        elasticsearch: {
          skipStartupConnectionCheck: true,
        },
      },
      {
        oss: false,
      }
    );
    await root.preboot();
    const { savedObjects } = await root.setup();

    typeRegistry = savedObjects.getTypeRegistry();
  });

  afterAll(async () => {
    if (root) {
      await root.shutdown();
    }
  });

  it('detecting mappings added without associated model version', async () => {
    const registeredTypes = typeRegistry.getAllTypes();
    const registeredMappings = registeredTypes.reduce<SavedObjectsTypeMappingDefinitions>(
      (memo, type) => {
        memo[type.name] = type.mappings;
        return memo;
      },
      {}
    );

    const fieldsFromRegisteredTypes = getFieldListMapFromMappingDefinitions(registeredMappings);
    const fieldsFromFile = await readCurrentFields();
    const fieldsFromModelVersions = getFieldListMapFromModelVersions(registeredTypes);

    const allTypeNames = [
      ...new Set([
        ...Object.keys(fieldsFromRegisteredTypes),
        ...Object.keys(fieldsFromFile),
        ...Object.keys(fieldsFromModelVersions),
      ]),
    ];

    const results = allTypeNames.reduce<Record<string, CompareResult>>((memo, typeName) => {
      memo[typeName] = compareFieldLists({
        registeredFields: fieldsFromRegisteredTypes[typeName],
        fileFields: fieldsFromFile[typeName],
        modelVersionFields: fieldsFromModelVersions[typeName],
      });
      return memo;
    }, {});

    const hasError = Object.values(results).some((result) => result.error);

    if (hasError) {
      const errorMessage = getErrorMessage(results);
      throw new Error(errorMessage);
    } else {
      const updatedFields = updateCurrentFields(fieldsFromFile, results);
      await writeCurrentFieldsFile(updatedFields);
    }
  });
});

const getErrorMessage = (results: Record<string, CompareResult>): string => {
  const errors = Object.entries(results)
    .filter(([_, result]) => result.error)
    .reduce<string[]>((memo, [typeName, result]) => {
      if (result.missingFromDefinition.length) {
        errors.push(
          `- ${typeName}: found mappings from model version not present in mappings definition: ${result.missingFromDefinition.join(
            ','
          )}`
        );
      }
      if (result.missingFromModelVersion.length) {
        errors.push(
          `- ${typeName}: found mappings from  mappings definition not present in any model version: ${result.missingFromModelVersion.join(
            ','
          )}`
        );
      }
      return memo;
    }, []);

  return `Found issues in savedObjects mappings:\n${errors.join('\n')}`;
};

const updateCurrentFields = (
  currentFields: FieldListMap,
  results: Record<string, CompareResult>
): FieldListMap => {
  // mutating the field lists is fine
  const updatedFields = { ...currentFields };
  Object.entries(results).forEach(([typeName, typeResult]) => {
    if (!typeResult.error) {
      updatedFields[typeName] = [
        ...new Set([...(updatedFields[typeName] || []), ...typeResult.fieldsToAdd]),
      ];
    }
  });
  return updatedFields;
};

const CURRENT_FIELDS_FILE_PATH = Path.resolve(__dirname, '../current_fields.json');

const readCurrentFields = async (): Promise<FieldListMap> => {
  try {
    const fileContent = await readFile(CURRENT_FIELDS_FILE_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
};

const writeCurrentFieldsFile = async (fieldMap: FieldListMap) => {
  await writeFile(CURRENT_FIELDS_FILE_PATH, JSON.stringify(fieldMap, null, 2) + '\n', 'utf-8');
};

interface CompareResult {
  error: boolean;
  fieldsToAdd: string[];
  missingFromModelVersion: string[];
  missingFromDefinition: string[];
}

const compareFieldLists = ({
  fileFields,
  registeredFields = [],
  modelVersionFields = [],
}: {
  fileFields: string[] | undefined;
  registeredFields: string[] | undefined;
  modelVersionFields: string[] | undefined;
}): CompareResult => {
  // type not present in the file, so it was just added.
  // in that case we just update the file to add all the registered fields.
  if (!fileFields) {
    return {
      error: false,
      fieldsToAdd: registeredFields,
      missingFromModelVersion: [],
      missingFromDefinition: [],
    };
  }

  // we search all registered/mv fields not already in the file
  const registeredFieldsNotInFile = difference(registeredFields, fileFields);
  const modelVersionFieldsNotInFile = difference(modelVersionFields, fileFields);

  // then we search for registered fields not in model versions, and the opposite
  const registeredFieldsNotInModelVersions = difference(
    registeredFieldsNotInFile,
    modelVersionFieldsNotInFile
  );
  const modelVersionFieldsNotRegistered = difference(
    modelVersionFieldsNotInFile,
    registeredFieldsNotInFile
  );

  // if any non-file field is present only in mapping definition or in model version, then there's an error on the type
  const anyFieldMissing =
    registeredFieldsNotInModelVersions.length > 0 || modelVersionFieldsNotRegistered.length > 0;

  return {
    error: anyFieldMissing,
    fieldsToAdd: anyFieldMissing ? [] : registeredFieldsNotInFile,
    missingFromModelVersion: registeredFieldsNotInModelVersions,
    missingFromDefinition: modelVersionFieldsNotRegistered,
  };
};

const getModelVersionAddedFieldsForType = (typeDef: SavedObjectsType): string[] => {
  const addedFieldSet = new Set<string>();
  const versions =
    typeof typeDef.modelVersions === 'function'
      ? typeDef.modelVersions()
      : typeDef.modelVersions ?? {};
  Object.values(versions).forEach((version) => {
    const addedFields = getVersionAddedFields(version);
    addedFields.forEach((field) => addedFieldSet.add(field));
  });
  return [...addedFieldSet].sort();
};

const getFieldListMapFromModelVersions = (types: SavedObjectsType[]): FieldListMap => {
  return types.reduce<FieldListMap>((memo, type) => {
    memo[type.name] = getModelVersionAddedFieldsForType(type);
    return memo;
  }, {});
};
