import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { LatencyAggregationType } from '@kbn/apm-types';
import type { TransactionGroup, TransactionGroupInteraction, TransactionsTableHeaderAction } from './types';
import type { ColumnId } from './get_columns';
export type { TransactionGroup, TransactionGroupInteraction, TransactionsTableHeaderAction };
export type { ColumnId };
interface TransactionsTableProps {
    items: TransactionGroup[];
    isLoading: boolean;
    maxCountExceeded: boolean;
    title?: string;
    headerActions?: TransactionsTableHeaderAction[];
    latencyAggregationType?: LatencyAggregationType;
    columns?: Array<ColumnId | EuiBasicTableColumn<TransactionGroup>>;
    showMaxTransactionGroupsExceededWarning?: boolean;
    columnInteractions?: {
        name?: TransactionGroupInteraction;
        alerts?: TransactionGroupInteraction;
    };
    onSearchQueryChange?: (query: string) => void;
    remainingTransactionsCellTooltipContent?: React.ReactNode;
    showSparklines?: boolean;
    isSparklineLoading?: boolean;
    errorMessage?: string;
    'data-test-subj': string;
}
export declare function TransactionsTable({ items, isLoading, maxCountExceeded, title, headerActions, latencyAggregationType, columns, showMaxTransactionGroupsExceededWarning, columnInteractions, onSearchQueryChange, remainingTransactionsCellTooltipContent, showSparklines: showSparklinesProp, isSparklineLoading, errorMessage, 'data-test-subj': dataTestSubj, }: TransactionsTableProps): React.JSX.Element;
