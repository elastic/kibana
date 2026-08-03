import React from 'react';
import type { ReactNode } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { LatencyAggregationType } from '@kbn/apm-types';
import type { TransactionGroup, TransactionGroupInteraction } from './types';
export type ColumnId = 'alerts' | 'name' | 'latency' | 'throughput' | 'errorRate';
export declare const DEFAULT_COLUMNS: ColumnId[];
export declare function getBuiltInColumns({ latencyAggregationType, nameInteraction, alertsInteraction, showSparklines, isSparklineLoading, remainingTransactionsCellTooltipContent, }: {
    latencyAggregationType?: LatencyAggregationType;
    nameInteraction?: TransactionGroupInteraction;
    alertsInteraction?: TransactionGroupInteraction;
    showSparklines?: boolean;
    isSparklineLoading?: boolean;
    remainingTransactionsCellTooltipContent?: ReactNode;
}): Record<ColumnId, EuiBasicTableColumn<TransactionGroup>>;
export declare function ImpactColumn({ impact, }: {
    impact: TransactionGroup['impact'];
}): React.ReactElement | null;
