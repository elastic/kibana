import React from 'react';
import { type FieldButtonProps } from '@kbn/react-field';
import type { EuiButtonIconProps } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { type FieldListItem, type GetCustomFieldType } from '../../types';
/**
 * Props of FieldItemButton component
 */
export interface FieldItemButtonProps<T extends FieldListItem> {
    field: T;
    fieldSearchHighlight?: string;
    isSelected: boolean;
    isActive: FieldButtonProps['isActive'];
    isEmpty: boolean;
    infoIcon?: FieldButtonProps['fieldInfoIcon'];
    className?: FieldButtonProps['className'];
    flush?: FieldButtonProps['flush'];
    withDragIcon?: boolean;
    getCustomFieldType?: GetCustomFieldType<T>;
    dataTestSubj?: string;
    size?: FieldButtonProps['size'];
    onClick: FieldButtonProps['onClick'];
    shouldAlwaysShowAction?: boolean;
    buttonAddFieldToWorkspaceProps?: Partial<EuiButtonIconProps>;
    buttonRemoveFieldFromWorkspaceProps?: Partial<EuiButtonIconProps>;
    onAddFieldToWorkspace?: (field: T) => unknown;
    onRemoveFieldFromWorkspace?: (field: T) => unknown;
}
/**
 * Field list item component
 * @param field
 * @param fieldSearchHighlight
 * @param isSelected
 * @param isActive
 * @param isEmpty
 * @param infoIcon
 * @param className
 * @param getCustomFieldType
 * @param dataTestSubj
 * @param size
 * @param withDragIcon
 * @param onClick
 * @param shouldAlwaysShowAction
 * @param buttonAddFieldToWorkspaceProps
 * @param buttonRemoveFieldFromWorkspaceProps
 * @param onAddFieldToWorkspace
 * @param onRemoveFieldFromWorkspace
 * @param otherProps
 * @constructor
 */
export declare function FieldItemButton<T extends FieldListItem = DataViewField>({ field, fieldSearchHighlight, isSelected, isActive, isEmpty, infoIcon, className, getCustomFieldType, dataTestSubj, size, withDragIcon, onClick, shouldAlwaysShowAction, buttonAddFieldToWorkspaceProps, buttonRemoveFieldFromWorkspaceProps, onAddFieldToWorkspace, onRemoveFieldFromWorkspace, ...otherProps }: FieldItemButtonProps<T>): React.JSX.Element;
export type GenericFieldItemButtonType = typeof FieldItemButton;
