import React from 'react';
import type { CategorizedFields, UnsavedFieldChanges, CategoryCounts } from '@kbn/management-settings-types';
import type { FieldRowProps } from '@kbn/management-settings-components-field-row';
import { type FieldCategoryProps } from './category';
/**
 * Props for the {@link FieldCategories} component.
 */
export interface FieldCategoriesProps extends Pick<FieldCategoryProps, 'onClearQuery'>, Pick<FieldRowProps, 'onFieldChange' | 'isSavingEnabled'> {
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
export declare const FieldCategories: ({ categorizedFields, categoryCounts, unsavedChanges, onClearQuery, isSavingEnabled, onFieldChange, }: FieldCategoriesProps) => React.JSX.Element;
