/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useArgs } from '@storybook/client-api';
import { action } from '@storybook/addon-actions';

import { getSettingsMock } from '@kbn/management-settings-utilities/mocks/settings.mock';
import { getFieldDefinitions } from '@kbn/management-settings-field-definition';
import { categorizeFields } from '@kbn/management-settings-utilities';
import { UnsavedFieldChanges, OnFieldChangeFn } from '@kbn/management-settings-types';

export interface Params {
  isFiltered: boolean;
  isSavingEnabled: boolean;
}

export const useCategoryStory = ({ isFiltered, isSavingEnabled }: Params) => {
  const [_args, updateArgs] = useArgs();
  const settings = getSettingsMock();

  // Markdown and JSON fields require Monaco, which are *notoriously* slow in Storybook due
  // to the lack of a webworker.  Until we can resolve it, filter out those fields.
  const definitions = getFieldDefinitions(settings, {
    isCustom: () => {
      return false;
    },
    isOverridden: () => {
      return false;
    },
  }).filter((field) => field.type !== 'json' && field.type !== 'markdown');

  const categorizedFields = categorizeFields(definitions);

  if (isFiltered) {
    Object.keys(categorizedFields).forEach((category) => {
      categorizedFields[category].fields = categorizedFields[category].fields.slice(0, 1);
    });
  }

  const onClearQuery = () => updateArgs({ isFiltered: false });

  const [unsavedChanges, setUnsavedChanges] = React.useState<UnsavedFieldChanges>({});

  const onFieldChange: OnFieldChangeFn = (id, change) => {
    action('onFieldChange')(id, change);

    if (!change) {
      const { [id]: unsavedChange, ...rest } = unsavedChanges;
      setUnsavedChanges(rest);
      return;
    }

    setUnsavedChanges((changes) => ({ ...changes, [id]: change }));
  };

  const categoryCounts = Object.keys(categorizedFields).reduce(
    (acc, category) => ({
      ...acc,
      [category]: categorizedFields[category].count,
    }),
    {}
  );

  return {
    onClearQuery,
    onFieldChange,
    isSavingEnabled,
    unsavedChanges,
    categorizedFields,
    categoryCounts,
  };
};
