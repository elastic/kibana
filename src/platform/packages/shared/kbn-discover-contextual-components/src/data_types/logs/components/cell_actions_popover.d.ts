import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { type EuiBadgeProps } from '@elastic/eui';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { DataViewField } from '@kbn/data-views-plugin/common';
interface CellActionsPopoverProps {
    onFilter?: DocViewFilterFn;
    /** ECS mapping for the key */
    property?: DataViewField;
    name: string;
    /** Formatted value from field formatter (React node) */
    formattedValue: ReactNode;
    /** Plain text version of the value for copying to clipboard */
    textValue: string;
    /** The raw value from the mapping, can be an object */
    rawValue: unknown;
    /** Optional callback to customize rendering of the formatted value */
    renderFormattedValue?: (formattedValue: ReactNode) => ReactNode;
    /** Props to forward to the trigger Badge */
    renderPopoverTrigger: (props: {
        popoverTriggerProps: {
            onClick: () => void;
            onClickAriaLabel: string;
            'data-test-subj': string;
        };
    }) => ReactElement;
}
export declare function CellActionsPopover({ onFilter, property, name, formattedValue, textValue, rawValue, renderFormattedValue, renderPopoverTrigger, }: CellActionsPopoverProps): React.JSX.Element;
export interface FieldBadgeWithActionsProps extends Pick<CellActionsPopoverProps, 'onFilter' | 'name' | 'property' | 'formattedValue' | 'textValue' | 'rawValue' | 'renderFormattedValue'> {
    icon?: EuiBadgeProps['iconType'];
    color?: string;
    truncateTitle?: boolean;
}
interface FieldBadgeWithActionsDependencies {
    core?: CoreStart;
    share?: SharePluginStart;
}
export type FieldBadgeWithActionsPropsAndDependencies = FieldBadgeWithActionsProps & FieldBadgeWithActionsDependencies;
export declare function FieldBadgeWithActions({ icon, onFilter, name, property, renderFormattedValue, formattedValue, textValue, rawValue, color, truncateTitle, }: FieldBadgeWithActionsPropsAndDependencies): React.JSX.Element;
export {};
