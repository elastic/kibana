/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAssignment, isMap, isStringLiteral } from '@elastic/esql';
import type { ESQLAstIpLocationCommand } from '@elastic/esql/types';
import { Commands } from '../../definitions/keywords';
import { getColumnName, getCommandOutput } from '../../definitions/utils/columns';
import { getMapEntryByStringKeyFromAst } from '../../definitions/utils/maps';
import {
  endsWithAssignment,
  endsWithWhitespace,
  matchesWildcardPattern,
} from '../../definitions/utils/regex';
import type { ElasticsearchCommandOutputVariant, SupportedDataType } from '../../definitions/types';

export enum IpLocationPosition {
  AFTER_IP_LOCATION_KEYWORD = 'after_ip_location_keyword',
  AFTER_TARGET_FIELD = 'after_target_field',
  AFTER_ASSIGN = 'after_assign',
  AFTER_EXPRESSION = 'after_expression',
  AFTER_WITH_KEYWORD = 'after_with_keyword',
  WITHIN_OPTIONS = 'within_options',
  WITHIN_PROPERTIES_ARRAY = 'within_properties_array',
  AFTER_COMMAND = 'after_command',
}

/**
 * When the query omits database_file, ES uses GeoLite2-City.mmdb.
 * The generated command definition stores those output columns under this wildcard variant.
 */
const IP_LOCATION_DEFAULT_OUTPUT_VARIANT = '*-City.mmdb';

/** Keeps only properties included by ES when the user does not pass properties. */
export const getDefaultPropertyNames = (variant: ElasticsearchCommandOutputVariant): string[] =>
  Object.entries(variant)
    .filter(([, metadata]) => metadata.default !== false)
    .map(([property]) => property);

/** Resolves a property type when no concrete database variant is available. */
export const getPropertyTypeFromAnyVariant = (property: string): SupportedDataType | undefined => {
  const output = getIpLocationOutputDefinition();

  if (!output) {
    return undefined;
  }

  for (const variant of Object.values(output.variants)) {
    const metadata = variant[property];
    if (metadata) {
      return metadata.type;
    }
  }

  return undefined;
};

/** Selects the output variant that controls which columns IP_LOCATION creates. */
export const getIpLocationVariant = (
  command: ESQLAstIpLocationCommand
): ElasticsearchCommandOutputVariant | undefined => {
  const output = getIpLocationOutputDefinition();

  if (!output) {
    return undefined;
  }

  const databaseFileEntry = getMapEntryByStringKeyFromAst(command.namedParameters, 'database_file');
  if (!databaseFileEntry) {
    return output.variants[IP_LOCATION_DEFAULT_OUTPUT_VARIANT];
  }

  const { value } = databaseFileEntry;
  if (!isStringLiteral(value)) {
    return undefined;
  }

  const normalizedDatabaseFile = value.valueUnquoted.toLowerCase();

  return Object.entries(output.variants).find(([pattern]) =>
    matchesWildcardPattern(pattern.toLowerCase(), normalizedDatabaseFile)
  )?.[1];
};

/** Lists properties that autocomplete can suggest for the active database file. */
export const getPropertyNamesForDatabase = (command: ESQLAstIpLocationCommand): string[] => {
  const variant = getIpLocationVariant(command);

  return variant ? Object.keys(variant) : getAllKnownProperties();
};

/** Converts the target field AST into the prefix used for generated column names. */
export const getIpLocationTargetPrefix = (
  command: ESQLAstIpLocationCommand
): string | undefined => {
  const { targetField } = command;

  if (!targetField) {
    return undefined;
  }

  return getColumnName(targetField);
};

/** Maps the cursor location to the autocomplete state for IP_LOCATION syntax. */
export function getPosition(
  command: ESQLAstIpLocationCommand,
  innerText: string
): IpLocationPosition {
  const cursorPosition = innerText.length;
  const { targetField, expression, namedParameters } = command;
  const hasAssignment = command.args.some((arg) => !Array.isArray(arg) && isAssignment(arg));
  const hasTargetFieldName = !!targetField?.name?.trim().length;

  if (namedParameters !== undefined) {
    const map = isMap(namedParameters) ? namedParameters : undefined;
    if (!map || (map.incomplete && !map.text)) return IpLocationPosition.AFTER_WITH_KEYWORD;

    const isWithinMap = map.incomplete
      ? !(map.text.trimEnd().endsWith('}') && cursorPosition > map.location.max)
      : cursorPosition <= map.location.max;

    if (!isWithinMap) return IpLocationPosition.AFTER_COMMAND;

    const propertiesEntry = getMapEntryByStringKeyFromAst(command.namedParameters, 'properties');
    if (
      propertiesEntry &&
      cursorPosition >= propertiesEntry.value.location.min &&
      cursorPosition <= propertiesEntry.value.location.max
    ) {
      return IpLocationPosition.WITHIN_PROPERTIES_ARRAY;
    }

    return IpLocationPosition.WITHIN_OPTIONS;
  }

  if (
    hasAssignment &&
    expression &&
    !expression.incomplete &&
    cursorPosition > expression.location.max &&
    !endsWithAssignment(innerText)
  ) {
    return IpLocationPosition.AFTER_EXPRESSION;
  }

  if (
    hasAssignment &&
    (endsWithAssignment(innerText) ||
      !expression ||
      expression.incomplete ||
      cursorPosition <= expression.location.max)
  ) {
    return IpLocationPosition.AFTER_ASSIGN;
  }

  if (hasTargetFieldName && endsWithWhitespace(innerText)) {
    return IpLocationPosition.AFTER_TARGET_FIELD;
  }

  return IpLocationPosition.AFTER_IP_LOCATION_KEYWORD;
}

/** Returns the generated output schema used to infer new columns. */
const getIpLocationOutputDefinition = () => getCommandOutput(Commands.IP_LOCATION);

/** Builds the property list used when the selected database file is unknown. */
const getAllKnownProperties = (): string[] => {
  const output = getIpLocationOutputDefinition();

  if (!output) {
    return [];
  }

  return Array.from(
    new Set(Object.values(output.variants).flatMap((variant) => Object.keys(variant)))
  ).sort();
};
