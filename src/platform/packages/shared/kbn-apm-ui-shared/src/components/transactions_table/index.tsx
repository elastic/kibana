/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { LatencyAggregationType } from '@kbn/apm-types';
import type { TransactionGroup, TransactionGroupInteraction } from './types';
import { getBuiltInColumns, DEFAULT_COLUMNS } from './get_columns';
import type { ColumnId } from './get_columns';

export type { TransactionGroup, TransactionGroupInteraction };
export type { ColumnId };

interface TransactionsTableProps {
  items: TransactionGroup[];
  isLoading: boolean;
  maxCountExceeded: boolean;
  latencyAggregationType?: LatencyAggregationType;
  columns?: Array<ColumnId | EuiBasicTableColumn<TransactionGroup>>;
  showMaxTransactionGroupsExceededWarning?: boolean;
  numberOfTransactionsPerPage?: number;
  showPerPageOptions?: boolean;
  columnInteractions?: {
    name?: TransactionGroupInteraction;
    alerts?: TransactionGroupInteraction;
  };
  showSparklines?: boolean;
  onSearchQueryChange?: (query: string) => void;
  onRenderedItemsChange?: (items: TransactionGroup[]) => void;
  remainingTransactionsCellTooltipContent?: React.ReactNode;
}

function shouldFetchServer({
  maxCountExceeded,
  newSearchQuery,
  oldSearchQuery,
}: {
  maxCountExceeded: boolean;
  newSearchQuery: string;
  oldSearchQuery: string;
}) {
  return maxCountExceeded || !newSearchQuery.includes(oldSearchQuery);
}

export function TransactionsTable({
  items,
  isLoading,
  maxCountExceeded,
  latencyAggregationType,
  columns,
  showMaxTransactionGroupsExceededWarning = false,
  numberOfTransactionsPerPage = 10,
  showPerPageOptions = true,
  columnInteractions,
  showSparklines,
  onSearchQueryChange,
  onRenderedItemsChange,
  remainingTransactionsCellTooltipContent,
}: TransactionsTableProps) {
  const searchQueryRef = useRef('');

  const onSearchQueryChangeRef = useRef(onSearchQueryChange);
  onSearchQueryChangeRef.current = onSearchQueryChange;

  const debouncedSearchQueryChange = useRef(
    debounce((query: string) => onSearchQueryChangeRef.current?.(query), 300)
  );

  useEffect(() => () => debouncedSearchQueryChange.current.cancel(), []);

  const isWithinLBreakpoint = useIsWithinMaxBreakpoint('l');
  const resolvedShowSparklines = showSparklines ?? !isWithinLBreakpoint;

  const resolvedColumns = useMemo(() => {
    const builtIn = getBuiltInColumns({
      latencyAggregationType,
      nameInteraction: columnInteractions?.name,
      alertsInteraction: columnInteractions?.alerts,
      showSparklines: resolvedShowSparklines,
      remainingTransactionsCellTooltipContent,
    });
    return (columns ?? DEFAULT_COLUMNS).map((col) =>
      typeof col === 'string' ? builtIn[col] : col
    );
  }, [
    latencyAggregationType,
    columnInteractions,
    resolvedShowSparklines,
    columns,
    remainingTransactionsCellTooltipContent,
  ]);

  const onSearchChange = useCallback(
    ({ queryText }: { queryText: string }) => {
      const oldSearchQuery = searchQueryRef.current;
      searchQueryRef.current = queryText;

      if (shouldFetchServer({ maxCountExceeded, newSearchQuery: queryText, oldSearchQuery })) {
        debouncedSearchQueryChange.current(queryText);
      }
      return true;
    },
    [maxCountExceeded]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {showMaxTransactionGroupsExceededWarning && maxCountExceeded && (
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('apmUiShared.transactionsTable.cardinalityWarning.title', {
              defaultMessage:
                'Number of transaction groups exceed the allowed maximum (1,000) that are displayed.',
            })}
            color="warning"
            iconType="warning"
          >
            <p>
              <FormattedMessage
                id="apmUiShared.transactionsTable.transactionGroupLimit.exceeded"
                defaultMessage="The maximum number of transaction groups displayed in Kibana has been reached. Try narrowing down results by using the query bar."
              />
            </p>
          </EuiCallOut>
        </EuiFlexItem>
      )}

      <EuiFlexItem>
        <EuiInMemoryTable
          items={items}
          columns={resolvedColumns}
          loading={isLoading}
          noItemsMessage={
            isLoading
              ? i18n.translate('apmUiShared.transactionsTable.loading', {
                  defaultMessage: 'Loading...',
                })
              : i18n.translate('apmUiShared.transactionsTable.noResults', {
                  defaultMessage: 'No transactions found',
                })
          }
          pagination={{
            initialPageSize: numberOfTransactionsPerPage,
            showPerPageOptions,
            pageSizeOptions: [10, 25, 50],
          }}
          sorting={{ sort: { field: 'latency' as keyof TransactionGroup, direction: 'desc' } }}
          search={{
            box: { incremental: true },
            onChange: onSearchChange,
          }}
          onTableChange={({ page }: { page?: { index: number; size: number } }) => {
            if (!onRenderedItemsChange || !page) return;
            const { index, size } = page;
            onRenderedItemsChange(items.slice(index * size, (index + 1) * size));
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
