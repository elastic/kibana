import type { EuiButtonIconProps, IconType } from '@elastic/eui';
import type { Interpolation, Theme } from '@emotion/react';
import type { FC, ReactElement } from 'react';
import type React from 'react';
import type { DataTableRecord } from '../../types';
export interface RowControlRowProps {
    rowIndex: number;
    record: DataTableRecord;
}
export interface RowControlProps {
    color?: EuiButtonIconProps['color'];
    css?: Interpolation<Theme>;
    'data-test-subj'?: string;
    disabled?: boolean;
    iconType: IconType;
    label: string;
    onClick: ((props: RowControlRowProps) => void) | undefined;
    tooltipContent?: React.ReactNode;
}
export type RowControlComponent = FC<RowControlProps>;
export interface RowControlColumn {
    id: string;
    render: (Control: RowControlComponent, props: RowControlRowProps) => ReactElement;
    width?: number;
}
