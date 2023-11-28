/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { createFailError } from '@kbn/dev-cli-errors';
import {
  FieldListMap,
  getFieldListMapFromMappingDefinitions,
  SavedObjectsTypeMappingDefinitions,
} from '@kbn/core-saved-objects-base-server-internal';
import { getTypeRegistry } from './get_type_registry';
import { compareFieldLists, type CompareResult } from './compare_type_field_lists';
import { readCurrentFields, writeCurrentFields } from './current_fields';
import { getFieldListMapFromModelVersions } from './get_field_list_from_model_version';

export const runModelVersionMappingAdditionsChecks = async ({
  fix,
  verify,
  log,
}: {
  fix: boolean;
  verify: boolean;
  log: ToolingLog;
}) => {
  log.info('Loading core to retrieve the populated type registry...');
  const typeRegistry = await getTypeRegistry();

  const registeredTypes = typeRegistry.getAllTypes();
  const registeredMappings = registeredTypes.reduce<SavedObjectsTypeMappingDefinitions>(
    (memo, type) => {
      memo[type.name] = type.mappings;
      return memo;
    },
    {}
  );

  log.info('Generating field lists from registry and file');
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

  log.info('Generating field delta');
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
    throw createFailError(errorMessage);
  } else {
    log.info('Updating field file');
    const updatedFields = updateCurrentFields(fieldsFromFile, results);
    await writeCurrentFields(updatedFields);
  }
};

const getErrorMessage = (results: Record<string, CompareResult>): string => {
  const errors = Object.entries(results)
    .filter(([_, result]) => result.error)
    .reduce<string[]>((memo, [typeName, result]) => {
      if (result.missingFromDefinition.length) {
        memo.push(
          `- ${typeName}: found mappings from model version not present in mappings definition: ${result.missingFromDefinition.join(
            ','
          )}`
        );
      }
      if (result.missingFromModelVersion.length) {
        memo.push(
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
