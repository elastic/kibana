/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import words from 'lodash/words';

import { Query } from '@elastic/eui';
import { FieldDefinition, SettingType } from '@kbn/management-settings-types';
import { UiSettingMetadata } from '@kbn/management-settings-types';
import { isSettingDefaultValue } from '@kbn/management-settings-utilities';

/**
 * The portion of the setting name that defines the category of the setting.
 */
export const CATEGORY_FIELD = 'category';

/**
 * The default category for a setting, if not supplied.
 */
export const DEFAULT_CATEGORY = 'general';

const mapWords = (name?: string): string =>
  words(name ?? '')
    .map((word) => word.toLowerCase())
    .join(' ');

/**
 * Derive the aria-label for a given setting based on its name and category.
 */
const getAriaLabel = (name: string = '') => {
  if (!name) {
    return '';
  }

  const query = Query.parse(name);

  if (query.hasOrFieldClause(CATEGORY_FIELD)) {
    const categories = query.getOrFieldClause(CATEGORY_FIELD);
    const termValue = mapWords(query.removeOrFieldClauses(CATEGORY_FIELD).text);

    if (!categories || !Array.isArray(categories.value)) {
      return termValue;
    }

    let categoriesQuery = Query.parse('');
    categories.value.forEach((v) => {
      categoriesQuery = categoriesQuery.addOrFieldValue(CATEGORY_FIELD, v);
    });

    return `${termValue} ${categoriesQuery.text}`;
  }

  return mapWords(name);
};

/**
 * Parameters for converting a {@link UiSettingMetadata} object into a {@link FieldDefinition}
 * for use in the UI.
 * @internal
 */
interface GetDefinitionParams<T extends SettingType> {
  /** The id of the field. */
  id: string;
  /** The source setting from Kibana. */
  setting: UiSettingMetadata<T>;
  /** Optional parameters */
  params?: {
    /** True if the setting it custom, false otherwise */
    isCustom?: boolean;
    /** True if the setting is overridden in Kibana, false otherwise. */
    isOverridden?: boolean;
  };
}

/**
 * Create a {@link FieldDefinition} from a {@link UiSettingMetadata} object for use
 * in the UI.
 *
 * @param parameters The {@link GetDefinitionParams} for creating the {@link FieldDefinition}.
 */
export const getFieldDefinition = <T extends SettingType>(
  parameters: GetDefinitionParams<T>
): FieldDefinition<T> => {
  const { id, setting, params = { isCustom: false, isOverridden: false } } = parameters;

  const {
    category,
    deprecation,
    description,
    metric,
    name,
    optionLabels,
    options: optionValues,
    order,
    readonly,
    requiresPageReload,
    type,
    userValue: savedValue,
    value: defaultValue,
  } = setting;

  const { isCustom, isOverridden } = params;

  // We only use the first provided category so that the filter by category works correctly
  const categories = category && category.length ? [category[0]] : [DEFAULT_CATEGORY];

  const options = {
    values: optionValues || [],
    labels: optionLabels || {},
  };

  const defaultValueDisplay =
    defaultValue === undefined || defaultValue === null || defaultValue === ''
      ? 'null'
      : String(defaultValue);

  const definition: FieldDefinition<T> = {
    ariaAttributes: {
      ariaLabel: name || getAriaLabel(name),
      // ariaDescribedBy: unsavedChange.value ? `${groupId} ${unsavedId}` : undefined,
    },
    categories,
    defaultValue,
    defaultValueDisplay,
    deprecation,
    description,
    displayName: name || id,
    groupId: `${name || id}-group`,
    id,
    isCustom: isCustom || false,
    isDefaultValue: isSettingDefaultValue(setting),
    isOverridden: isOverridden || false,
    isReadOnly: !!readonly,
    metric,
    name: name || id,
    options,
    order,
    requiresPageReload: !!requiresPageReload,
    savedValue,
    type,
    unsavedFieldId: `${id}-unsaved`,
  };

  // TODO: clintandrewhall - add validation (e.g. `select` contains non-empty `options`)
  return definition;
};
