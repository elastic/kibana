import React from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table/src/types';
export declare const getLogLevelBadgeCell: (logLevelField: string) => (props: DataGridCellValueElementProps) => React.JSX.Element;
export type LogLevelBadgeCell = ReturnType<typeof getLogLevelBadgeCell>;
