/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  CategorizedFields,
  UnsavedFieldChanges,
  CategoryCounts,
} from '@kbn/management-settings-types';

import { FieldRow, FieldRowProps } from '@kbn/management-settings-components-field-row';
import { FieldCategory, type FieldCategoryProps } from './category';

/**
 * Props for the {@link FieldCategories} component.
 */
export interface FieldCategoriesProps
  extends Pick<FieldCategoryProps, 'onClearQuery'>,
    Pick<FieldRowProps, 'onFieldChange' | 'isSavingEnabled'> {
  /** Categorized fields for display. */
  categorizedFields: CategorizedFields;
  categoryCounts: CategoryCounts;
  /** And unsaved changes currently managed by the parent component. */
  unsavedChanges?: UnsavedFieldChanges;
}

/**
 * Convenience component for displaying a set of {@link FieldCategory} components, given
 * a set of categorized fields.
 *
 * @param {FieldCategoriesProps} props props to pass to the {@link FieldCategories} component.
 */
export const FieldCategories = ({
  categorizedFields,
  categoryCounts,
  unsavedChanges = {},
  onClearQuery,
  isSavingEnabled,
  onFieldChange,
}: FieldCategoriesProps) => (
  <>
    {Object.entries(categorizedFields).map(([category, { count, fields }]) => (
      <FieldCategory
        key={category}
        fieldCount={categoryCounts[category]}
        {...{ category, onClearQuery }}
      >
        {fields.map((field) => (
          <FieldRow
            key={field.id}
            unsavedChange={unsavedChanges[field.id]}
            {...{ field, isSavingEnabled, onFieldChange }}
          />
        ))}
      </FieldCategory>
    ))}
  </>
);
