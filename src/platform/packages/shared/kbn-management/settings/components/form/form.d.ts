import React from 'react';
import type { FieldDefinition, CategoryCounts } from '@kbn/management-settings-types';
import type { UiSettingsScope } from '@kbn/core-ui-settings-common';
/**
 * Props for a {@link Form} component.
 */
export interface FormProps {
    /** A list of {@link FieldDefinition} corresponding to settings to be displayed in the form. */
    fields: FieldDefinition[];
    /** True if saving settings is enabled, false otherwise. */
    isSavingEnabled: boolean;
    /** Contains the number of registered settings in each category. */
    categoryCounts: CategoryCounts;
    /** Handler for the "clear search" link. */
    onClearQuery: () => void;
    /** {@link UiSettingsScope} of the settings in this form. */
    scope: UiSettingsScope;
}
/**
 * Component for displaying a set of {@link FieldRow} in a form.
 * @param props The {@link FormProps} for the {@link Form} component.
 */
export declare const Form: (props: FormProps) => React.JSX.Element;
