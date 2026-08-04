import type { ReactElement } from 'react';
import React from 'react';
import type { FieldRowProps } from '@kbn/management-settings-components-field-row';
import type { ClearQueryLinkProps } from './clear_query_link';
export declare const DATA_TEST_SUBJ_SETTINGS_CATEGORY = "settingsCategory";
/**
 * Props for a {@link FieldCategory} component.
 */
export interface FieldCategoryProps extends Pick<ClearQueryLinkProps, 'onClearQuery' | 'fieldCount'> {
    /** The name of the category. */
    category: string;
    /** Children-- should be {@link FieldRow} components. */
    children: ReactElement<FieldRowProps, 'FieldRow'> | Array<ReactElement<FieldRowProps, 'FieldRow'>>;
}
/**
 * Component for displaying a container of fields pertaining to a single
 * category.
 * @param props - the props to pass to the {@link FieldCategory} component.
 */
export declare const FieldCategory: (props: FieldCategoryProps) => React.JSX.Element;
