import React from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { CellRenderersExtensionParams } from '../../../context_awareness';
export declare const getServiceNameCell: (serviceNameField: string, { actions }: CellRenderersExtensionParams) => (props: DataGridCellValueElementProps) => React.JSX.Element;
