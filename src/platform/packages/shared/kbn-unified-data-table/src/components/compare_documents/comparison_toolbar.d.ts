import type { EuiDataGridCustomToolbarProps } from '@elastic/eui';
import type { ReactElement } from 'react';
import React from 'react';
export interface ComparisonToolbarProps {
    additionalControls: ReactElement;
    comparisonFields: string[];
    totalFields: number;
}
export declare const renderComparisonToolbar: ({ additionalControls, comparisonFields, totalFields, }: ComparisonToolbarProps) => (toolbarProps: EuiDataGridCustomToolbarProps) => ReactElement<any, string | React.JSXElementConstructor<any>>;
