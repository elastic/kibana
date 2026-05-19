import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { FieldIconProps } from '@kbn/react-field';
import React from 'react';
interface Props {
    fieldName: string;
    displayNameOverride?: string;
    fieldType?: string;
    fieldMapping?: DataViewField;
    fieldIconProps?: Omit<FieldIconProps, 'type'>;
    scripted?: boolean;
    highlight?: string;
    disableMultiFieldBadge?: boolean;
}
export declare function FieldName({ fieldName, fieldMapping, fieldType, fieldIconProps, displayNameOverride, scripted, highlight, disableMultiFieldBadge, }: Props): React.JSX.Element;
export {};
