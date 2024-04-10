/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { createFailError } from '@kbn/dev-cli-errors';
import { FieldListMap } from '@kbn/core-saved-objects-base-server-internal';
import { compareFieldLists, type CompareResult } from './compare_type_field_lists';
import { readCurrentFields, writeCurrentFields } from './current_fields';
import { extractFieldListsFromPlugins } from './extract_field_lists_from_plugins';

export const runModelVersionMappingAdditionsChecks = async ({
  fix,
  override,
  verify,
  log,
}: {
  fix: boolean;
  override: boolean;
  verify: boolean;
  log: ToolingLog;
}) => {
  log.info('Generating field lists from registry and file');
  const { fieldsFromRegisteredTypes, fieldsFromModelVersions } = await extractFieldListsFromPlugins(
    log
  );
  const currentFields = await readCurrentFields();

  const allTypeNames = [
    ...new Set([
      ...Object.keys(fieldsFromRegisteredTypes),
      ...Object.keys(currentFields),
      ...Object.keys(fieldsFromModelVersions),
    ]),
  ];

  log.info('Generating field delta');
  const results = allTypeNames.reduce<Record<string, CompareResult>>((memo, typeName) => {
    memo[typeName] = compareFieldLists({
      registeredFields: fieldsFromRegisteredTypes[typeName],
      currentFields: currentFields[typeName],
      modelVersionFields: fieldsFromModelVersions[typeName],
    });
    return memo;
  }, {});

  const hasError = Object.values(results).some((result) => result.error);
  if (hasError) {
    const errorMessage = getErrorMessage(results);
    if (verify) {
      throw createFailError(errorMessage + `\nUse --override --no-verify`);
    } else {
      log.warning(errorMessage);
    }
  }

  if (fix || override) {
    log.info(`Updating field file with override: ${override}`);
    const updatedFields = updateCurrentFields(currentFields, results, override);
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
          `- ${typeName}: found mappings from root definition not present in any model version: ${result.missingFromModelVersion.join(
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
  results: Record<string, CompareResult>,
  override: boolean
): FieldListMap => {
  // mutating the field lists is fine
  const updatedFields = override ? {} : { ...currentFields };
  Object.entries(results).forEach(([typeName, typeResult]) => {
    if (override) {
      updatedFields[typeName] = [...typeResult.registeredFields].sort();
    } else {
      if (!typeResult.error) {
        updatedFields[typeName] = [
          ...new Set([...(updatedFields[typeName] || []), ...typeResult.fieldsToAdd]),
        ].sort();
      }
    }
  });
  return updatedFields;
};
