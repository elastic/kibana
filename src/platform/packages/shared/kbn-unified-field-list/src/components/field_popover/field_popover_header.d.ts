import React from 'react';
import type { EuiButtonIconProps, EuiPopoverProps } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { AddFieldFilterHandler, GetCustomFieldType } from '../../types';
export interface FieldPopoverHeaderProps {
    field: DataViewField;
    closePopover: EuiPopoverProps['closePopover'];
    buttonAddFieldToWorkspaceProps?: Partial<EuiButtonIconProps>;
    buttonAddFilterProps?: Partial<EuiButtonIconProps>;
    buttonEditFieldProps?: Partial<EuiButtonIconProps>;
    buttonDeleteFieldProps?: Partial<EuiButtonIconProps>;
    getCustomFieldType?: GetCustomFieldType<DataViewField>;
    onAddBreakdownField?: (field: DataViewField | undefined) => void;
    onAddFieldToWorkspace?: (field: DataViewField) => unknown;
    onAddFilter?: AddFieldFilterHandler;
    onEditField?: (fieldName: string) => unknown;
    onDeleteField?: (fieldName: string) => unknown;
    services?: {
        fieldsMetadata?: FieldsMetadataPublicStart;
    };
    streamNames?: string[];
}
export declare const FieldPopoverHeader: React.FC<FieldPopoverHeaderProps>;
