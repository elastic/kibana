/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { getSettingsMock } from '@kbn/management-settings-utilities/mocks/settings.mock';
import { getFieldDefinitions } from '@kbn/management-settings-field-definition';
import { categorizeFields } from '@kbn/management-settings-utilities';
import { FieldRow } from '@kbn/management-settings-components-field-row';

import { FieldCategory as Component, type FieldCategoryProps as ComponentProps } from '../category';
import { Params, useCategoryStory } from './use_category_story';
import { FieldCategoryProvider } from '../services';

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

const categories = Object.keys(categorizeFields(definitions));

export default {
  title: 'Settings/Field Category/Category',
  description: '',
  args: {
    category: categories[0],
    isFiltered: false,
    isSavingEnabled: true,
  },
  argTypes: {
    category: {
      control: {
        type: 'select',
        options: categories,
      },
    },
  },
} as Meta<typeof Component>;

type FieldCategoryParams = Pick<ComponentProps, 'category'> & Params;

const CategoryComponent = ({ isFiltered, category, isSavingEnabled }: FieldCategoryParams) => {
  const { onClearQuery, onFieldChange, unsavedChanges } = useCategoryStory({
    isFiltered,
    isSavingEnabled,
  });

  const { count, fields } = categorizeFields(definitions)[category];
  const rows = isFiltered ? [fields[0]] : fields;

  return (
    <FieldCategoryProvider
      showDanger={action('showDanger')}
      links={{ deprecationKey: 'link/to/deprecation/docs' }}
      validateChange={async (key, value) => {
        action(`validateChange`)({
          key,
          value,
        });
        return { successfulValidation: true, valid: true };
      }}
      {...{ isSavingEnabled, onFieldChange }}
    >
      <Component category={category} fieldCount={count} onClearQuery={onClearQuery}>
        {rows.map((field) => (
          <FieldRow
            key={field.id}
            unsavedChange={unsavedChanges[field.id]}
            {...{ field, isSavingEnabled, onFieldChange }}
          />
        ))}
      </Component>
    </FieldCategoryProvider>
  );
};

export const Category: StoryObj<FieldCategoryParams> = {
  render: (params) => <CategoryComponent {...params} />,
};
