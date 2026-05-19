import React from 'react';
import type { SecuritySolutionCellRendererFeature } from '@kbn/discover-shared-plugin/public';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
export declare const createCellRendererAccessor: (cellRendererFeature?: SecuritySolutionCellRendererFeature) => Promise<((fieldName: string) => React.NamedExoticComponent<DataGridCellValueElementProps> | undefined) | undefined>;
