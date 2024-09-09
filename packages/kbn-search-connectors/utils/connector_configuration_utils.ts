/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  ConnectorConfigProperties,
  ConnectorConfiguration,
  Dependency,
  FieldType,
  isConfigEntry,
} from '..';

import { ConfigEntryView, ConfigView } from '../components/configuration/connector_configuration';

import { isCategoryEntry } from './is_category_entry';

import { isNotNullish } from './is_not_nullish';

export type ConnectorConfigEntry = ConnectorConfigProperties & { key: string };

export const validIntInput = (value: string | number | boolean | null): boolean => {
  // reject non integers (including x.0 floats), but don't validate if empty
  return (value !== null || value !== '') &&
    (isNaN(Number(value)) ||
      !Number.isSafeInteger(Number(value)) ||
      ensureStringType(value).indexOf('.') >= 0)
    ? false
    : true;
};

export const ensureCorrectTyping = (
  type: FieldType,
  value: string | number | boolean | null
): string | number | boolean | null => {
  switch (type) {
    case FieldType.INTEGER:
      return validIntInput(value) ? ensureIntType(value) : value;
    case FieldType.BOOLEAN:
      return ensureBooleanType(value);
    default:
      return ensureStringType(value);
  }
};

export const ensureStringType = (value: string | number | boolean | null): string => {
  return value !== null ? String(value) : '';
};

export const ensureIntType = (value: string | number | boolean | null): number | null => {
  // int is null-safe to prevent empty values from becoming zeroes
  if (value === null || value === '') {
    return null;
  }

  return parseInt(String(value), 10);
};

export const ensureBooleanType = (value: string | number | boolean | null): boolean => {
  return Boolean(value);
};

export function dependenciesSatisfied(
  dependencies: Dependency[],
  dependencyLookup: ConnectorConfiguration
): boolean {
  if (!dependencies) {
    return true;
  }

  for (const dependency of dependencies) {
    // casting here because this is always going to be a ConnectorConfigProperties and not a Category
    if (
      dependency.value !== (dependencyLookup[dependency.field] as ConnectorConfigProperties)?.value
    ) {
      return false;
    }
  }

  return true;
}

export const sortByConfigOrder = (a: ConnectorConfigEntry, b: ConnectorConfigEntry) => {
  if (isNotNullish(a.order)) {
    if (isNotNullish(b.order)) {
      return a.order - b.order;
    }
    return -1;
  }
  if (isNotNullish(b.order)) {
    // a doesn't have an order, but b has an order so takes precedence
    return 1;
  }
  return a.key.localeCompare(b.key);
};

export const hasUiRestrictions = (configEntry: Partial<ConnectorConfigEntry>) => {
  return (configEntry.ui_restrictions ?? []).length > 0;
};

export const filterSortValidateEntries = (
  configEntries: ConnectorConfigEntry[],
  config: ConnectorConfiguration,
  isNative: boolean
): ConfigEntryView[] => {
  return configEntries
    .filter((configEntry) =>
      isNative
        ? !hasUiRestrictions(configEntry) && dependenciesSatisfied(configEntry.depends_on, config)
        : dependenciesSatisfied(configEntry.depends_on, config)
    )
    .sort(sortByConfigOrder)
    .map((configEntry) => {
      const label = configEntry.label;

      const validationErrors = [];

      if (configEntry.type === FieldType.INTEGER && !validIntInput(configEntry.value)) {
        validationErrors.push(
          i18n.translate('searchConnectors.config.invalidInteger', {
            defaultMessage: '{label} must be an integer.',
            values: { label },
          })
        );
      }

      return {
        ...configEntry,
        isValid: validationErrors.length <= 0,
        validationErrors,
      };
    });
};

/**
 *
 * Sorts and filters the connector configuration
 *
 * Sorting is done by specified order (if present)
 * otherwise by alphabetic order of keys
 *
 * Filtering is done on any fields with ui_restrictions
 * or that have not had their dependencies met
 *
 */
export const sortAndFilterConnectorConfiguration = (
  config: ConnectorConfiguration,
  isNative: boolean
): ConfigView => {
  if (!config) {
    return {
      advancedConfigurations: [],
      categories: [],
      unCategorizedItems: [],
    };
  }
  // This casting is ugly but makes all of the iteration below work for TypeScript
  // extract_full_html is only defined for crawlers, who don't use this config screen
  // we explicitly filter it out as well
  const entries = Object.entries(
    config as Omit<ConnectorConfiguration, 'extract_full_html'>
  ).filter(([key]) => key !== 'extract_full_html');

  const groupedConfigView = entries
    .map(([key, entry]) => {
      if (!entry || !isCategoryEntry(entry)) {
        return null;
      }
      const configEntries = entries
        .map(([configKey, configEntry]) => {
          if (!configEntry || isCategoryEntry(configEntry) || configEntry.category !== key) {
            return null;
          }
          return { key: configKey, ...configEntry };
        })
        .filter(isNotNullish);
      return { ...entry, configEntries, key };
    })
    .filter(isNotNullish);

  const unCategorizedItems = filterSortValidateEntries(
    entries
      .map(([key, entry]) =>
        entry && !isCategoryEntry(entry) && !entry.category && !hasUiRestrictions(entry)
          ? { key, ...entry }
          : null
      )
      .filter(isNotNullish),
    config,
    isNative
  );
  const categories = groupedConfigView
    .map((category) => {
      const configEntries = filterSortValidateEntries(category.configEntries, config, isNative);

      return configEntries.length > 0 ? { ...category, configEntries } : null;
    })
    .filter(isNotNullish);

  const advancedConfigurations = isNative
    ? []
    : filterSortValidateEntries(
        entries
          .map(([key, entry]) => {
            return entry && isConfigEntry(entry) && entry.ui_restrictions.includes('advanced')
              ? { key, ...entry }
              : null;
          })
          .filter(isNotNullish),
        config,
        isNative
      );
  return {
    advancedConfigurations: advancedConfigurations || [],
    categories,
    unCategorizedItems,
  };
};
