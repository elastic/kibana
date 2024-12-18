/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ComponentMeta, Story } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { FieldCategories as Component } from '../categories';
import { Params, useCategoryStory } from './use_category_story';
import { FieldCategoryProvider } from '../services';

export default {
  title: 'Settings/Field Category/Categories',
  description: '',
  args: {
    isFiltered: false,
    isSavingEnabled: true,
  },
  argTypes: {
    isFiltered: {
      control: {
        type: 'boolean',
      },
    },
    isSavingEnabled: {
      control: {
        type: 'boolean',
      },
    },
  },
  parameters: {
    backgrounds: {
      default: 'ghost',
    },
  },
} as ComponentMeta<typeof Component>;

export const Categories: Story<Params> = (params) => {
  const {
    onClearQuery,
    isSavingEnabled,
    onFieldChange,
    unsavedChanges,
    categorizedFields,
    categoryCounts,
  } = useCategoryStory(params);

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
    >
      <Component
        {...{
          categorizedFields,
          categoryCounts,
          onFieldChange,
          unsavedChanges,
          onClearQuery,
          isSavingEnabled,
        }}
      />
    </FieldCategoryProvider>
  );
};
