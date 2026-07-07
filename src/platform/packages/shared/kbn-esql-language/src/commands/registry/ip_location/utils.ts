/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAssignment, isList, isMap, isStringLiteral, LeafPrinter } from '@elastic/esql';
import type { ESQLAstIpLocationCommand, ESQLList } from '@elastic/esql/types';
import { commandsMetadata } from '../../definitions/generated/commands/commands';
import { Commands } from '../../definitions/keywords';
import { getMapEntryByStringKey } from '../../definitions/utils/maps';
import { matchesWildcardPattern } from '../../definitions/utils/regex';
import type {
  ElasticsearchCommandDefinition,
  ElasticsearchCommandOutputDefinition,
  ElasticsearchCommandOutputVariant,
  SupportedDataType,
} from '../../definitions/types';

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
const MAXMIND_VARIANT_PATTERN = /^\*-(.+\.mmdb)$/;

/** Reads IP_LOCATION metadata from the generated command definitions. */
const getIpLocationDefinition = (): ElasticsearchCommandDefinition | undefined =>
  (commandsMetadata as Record<string, ElasticsearchCommandDefinition>)[Commands.IP_LOCATION];

/** Returns the generated output schema used to infer new columns. */
export const getIpLocationOutputDefinition = (): ElasticsearchCommandOutputDefinition | undefined =>
  getIpLocationDefinition()?.output;

/** City, Country, and ASN are the GeoLite2 MaxMind files; the other MaxMind variants use GeoIP2. */
const getMaxMindDatabasePrefix = (suffix: string): 'GeoLite2' | 'GeoIP2' =>
  suffix === 'City.mmdb' || suffix === 'Country.mmdb' || suffix === 'ASN.mmdb'
    ? 'GeoLite2'
    : 'GeoIP2';

/** Converts command definition output patterns into insertable MaxMind database filenames. */
const getDatabaseFileSuggestionFromVariantPattern = (pattern: string): string | undefined => {
  const suffix = pattern.match(MAXMIND_VARIANT_PATTERN)?.[1];

  if (!suffix) {
    return undefined;
  }

  return `${getMaxMindDatabasePrefix(suffix)}-${suffix}`;
};

/** Lists concrete database filenames that autocomplete can insert. */
export const getDatabaseFileSuggestions = (): string[] => {
  const output = getIpLocationOutputDefinition();

  if (!output) {
    return [];
  }

  return Object.keys(output.variants).flatMap((pattern) => {
    const suggestion = getDatabaseFileSuggestionFromVariantPattern(pattern);
    return suggestion ? [suggestion] : [];
  });
};

/** Keeps only properties included by ES when the user does not pass properties. */
export const getDefaultPropertyNames = (variant: ElasticsearchCommandOutputVariant): string[] =>
  Object.entries(variant)
    .filter(([, metadata]) => metadata.default !== false)
    .map(([property]) => property);

/** Builds the property list used when the selected database file is unknown. */
export const getAllKnownProperties = (): string[] => {
  const output = getIpLocationOutputDefinition();

  if (!output) {
    return [];
  }

  return Array.from(
    new Set(Object.values(output.variants).flatMap((variant) => Object.keys(variant)))
  ).sort();
};

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

  const databaseFileEntry = getMapEntryByStringKey(command.namedParameters, 'database_file');
  if (!databaseFileEntry) {
    return output.variants[IP_LOCATION_DEFAULT_OUTPUT_VARIANT];
  }

  const databaseFile = getDatabaseFile(command);
  if (!databaseFile) {
    return undefined;
  }

  const exactVariant = output.variants[databaseFile];
  if (exactVariant) {
    return exactVariant;
  }

  const normalizedDatabaseFile = databaseFile.toLowerCase();

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

  return LeafPrinter.column(targetField);
};

/** Returns the raw properties list so callers can inspect literals and cursor ranges. */
export const getPropertiesList = (command: ESQLAstIpLocationCommand): ESQLList | undefined => {
  const propertiesEntry = getMapEntryByStringKey(command.namedParameters, 'properties');

  if (!propertiesEntry) {
    return undefined;
  }

  return isList(propertiesEntry.value) ? propertiesEntry.value : undefined;
};

/** Extracts string property names selected by the user. */
export const getSelectedProperties = (command: ESQLAstIpLocationCommand): string[] | undefined => {
  const propertiesList = getPropertiesList(command);

  if (!propertiesList) {
    return undefined;
  }

  return propertiesList.values.filter(isStringLiteral).map(({ valueUnquoted }) => valueUnquoted);
};

/** Reads a literal database_file value without applying ES defaults. */
const getDatabaseFile = (command: ESQLAstIpLocationCommand): string | undefined => {
  const databaseFileEntry = getMapEntryByStringKey(command.namedParameters, 'database_file');

  if (!databaseFileEntry) {
    return undefined;
  }

  return isStringLiteral(databaseFileEntry.value)
    ? databaseFileEntry.value.valueUnquoted
    : undefined;
};

/** Maps the cursor location to the autocomplete state for IP_LOCATION syntax. */
export function getPosition(
  command: ESQLAstIpLocationCommand,
  innerText: string
): IpLocationPosition {
  const cursorPosition = innerText.length;
  const { targetField, expression, namedParameters } = command;
  const hasAssignment = command.args.some((arg) => !Array.isArray(arg) && isAssignment(arg));

  if (namedParameters !== undefined) {
    const map = isMap(namedParameters) ? namedParameters : undefined;
    if (!map || (map.incomplete && !map.text)) return IpLocationPosition.AFTER_WITH_KEYWORD;

    const isWithinMap = map.incomplete
      ? !(map.text.trimEnd().endsWith('}') && cursorPosition > map.location.max)
      : cursorPosition <= map.location.max;

    if (!isWithinMap) return IpLocationPosition.AFTER_COMMAND;

    const propertiesEntry = getMapEntryByStringKey(command.namedParameters, 'properties');
    if (
      propertiesEntry &&
      cursorPosition >= propertiesEntry.value.location.min &&
      cursorPosition <= propertiesEntry.value.location.max
    ) {
      return IpLocationPosition.WITHIN_PROPERTIES_ARRAY;
    }

    return IpLocationPosition.WITHIN_OPTIONS;
  }

  if (expression !== undefined) {
    if (expression.incomplete || cursorPosition <= expression.location.max + 1) {
      return IpLocationPosition.AFTER_ASSIGN;
    }
    return IpLocationPosition.AFTER_EXPRESSION;
  }

  if (hasAssignment) {
    return IpLocationPosition.AFTER_ASSIGN;
  }

  if (targetField && !targetField.incomplete) {
    return IpLocationPosition.AFTER_TARGET_FIELD;
  }

  return IpLocationPosition.AFTER_IP_LOCATION_KEYWORD;
}
