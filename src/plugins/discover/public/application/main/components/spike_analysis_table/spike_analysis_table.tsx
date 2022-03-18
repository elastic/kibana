/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState, FC } from 'react';
import { orderBy } from 'lodash';

import { Chart, BarSeries, ScaleType, Settings } from '@elastic/charts';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiStat,
  EuiTabbedContent,
  EuiIcon,
  EuiTreeView,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { WindowParameters } from '../chart/get_window_parameters';
import { useDiscoverServices } from '../../../../utils/use_discover_services';

import { ImpactBar } from './impact_bar';
import { useChangePointDetection, ChangePoint } from './use_change_point_detection';
import type { BaseSpikeAnalysisTableProps } from './spike_analysis_table_embeddable';
import type { ItemSetTreeNode } from './itemset_tree';
import { ProgressControls } from './progress_controls';

const loadingText = i18n.translate('xpack.apm.correlations.correlationsTable.loadingText', {
  defaultMessage: 'Loading...',
});

const noDataText = i18n.translate('xpack.apm.correlations.correlationsTable.noDataText', {
  defaultMessage: 'No data',
});

// const errorMessage = i18n.translate('xpack.apm.correlations.correlationsTable.errorMessage', {
//   defaultMessage: 'Failed to fetch',
// });

const PAGINATION_SIZE_OPTIONS = [5, 10, 20, 50];

enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure',
  NOT_INITIATED = 'not_initiated',
}

type EuiTreeViewProps = React.ComponentProps<typeof EuiTreeView>;
type ArrayElement<A> = A extends ReadonlyArray<infer T> ? T : never;
type EuiTreeViewNode = ArrayElement<EuiTreeViewProps['items']>;

interface SpikeAnalysisTableProps extends BaseSpikeAnalysisTableProps {
  spikeSelection: WindowParameters;
}

export const SpikeAnalysisTable: FC<SpikeAnalysisTableProps> = ({
  indexPattern,
  spikeSelection,
}) => {
  const { theme } = useDiscoverServices();
  const chartTheme = theme.useChartsTheme();
  const chartBaseTheme = theme.useChartsBaseTheme();
  const [isInitialized, setIsInitialized] = useState(false);

  const failedTransactionsCorrelationsColumns: Array<EuiBasicTableColumn<ChangePoint>> =
    useMemo(() => {
      const percentageColumns: Array<EuiBasicTableColumn<ChangePoint>> = [
        {
          width: '100px',
          field: 'pValue',
          name: 'p-value',
          render: (pValue: number) => pValue.toPrecision(3),
          sortable: true,
        },
      ];

      return [
        {
          width: '116px',
          field: 'normalizedScore',
          name: (
            <>
              {i18n.translate(
                'xpack.apm.correlations.failedTransactions.correlationsTable.pValueLabel',
                {
                  defaultMessage: 'Score',
                }
              )}
            </>
          ),
          align: RIGHT_ALIGNMENT,
          render: (_, { normalizedScore }) => {
            return (
              <>
                <ImpactBar size="m" value={normalizedScore * 100} />
              </>
            );
          },
          sortable: true,
        },
        {
          width: '116px',
          field: 'pValue',
          name: (
            <>
              {i18n.translate(
                'xpack.apm.correlations.failedTransactions.correlationsTable.impactLabel',
                {
                  defaultMessage: 'Impact',
                }
              )}
            </>
          ),
          render: (_, { pValue }) => {
            return null;
            // const label = getFailedTransactionsCorrelationImpactLabel(pValue);
            // return label ? <EuiBadge color={label.color}>{label.impact}</EuiBadge> : null;
          },
          sortable: true,
        },
        {
          field: 'fieldName',
          name: i18n.translate(
            'xpack.apm.correlations.failedTransactions.correlationsTable.fieldNameLabel',
            { defaultMessage: 'Field name' }
          ),
          sortable: true,
        },
        {
          field: 'fieldValue',
          name: i18n.translate(
            'xpack.apm.correlations.failedTransactions.correlationsTable.fieldValueLabel',
            { defaultMessage: 'Field value' }
          ),
          render: (_, { fieldValue }) => String(fieldValue).slice(0, 50),
          sortable: true,
        },
        ...percentageColumns,
        {
          width: '100px',
          actions: [
            {
              name: i18n.translate('xpack.apm.correlations.correlationsTable.filterLabel', {
                defaultMessage: 'Filter',
              }),
              description: i18n.translate(
                'xpack.apm.correlations.correlationsTable.filterDescription',
                { defaultMessage: 'Filter by value' }
              ),
              icon: 'plusInCircle',
              type: 'icon',
              onClick: (term: ChangePoint) => {
                // push(history, {
                //   query: {
                //     kuery: `${term.fieldName}:"${term.fieldValue}"`,
                //   },
                // });
                // onFilter();
                // trackApmEvent({ metric: 'correlations_term_include_filter' });
              },
            },
            {
              name: i18n.translate('xpack.apm.correlations.correlationsTable.excludeLabel', {
                defaultMessage: 'Exclude',
              }),
              description: i18n.translate(
                'xpack.apm.correlations.correlationsTable.excludeDescription',
                { defaultMessage: 'Filter out value' }
              ),
              icon: 'minusInCircle',
              type: 'icon',
              onClick: (term: ChangePoint) => {
                // push(history, {
                //   query: {
                //     kuery: `not ${term.fieldName}:"${term.fieldValue}"`,
                //   },
                // });
                // onFilter();
                // trackApmEvent({ metric: 'correlations_term_exclude_filter' });
              },
            },
          ],
          name: i18n.translate('xpack.apm.correlations.correlationsTable.actionsLabel', {
            defaultMessage: 'Filter',
          }),
          render: (_, { fieldName, fieldValue }) => {
            return (
              <>
                {/* <EuiLink
                  href={createHref(history, {
                    query: {
                      kuery: `${fieldName}:"${fieldValue}"`,
                    },
                  })}
                >
                  <EuiIcon type="magnifyWithPlus" />
                </EuiLink>
                &nbsp;/&nbsp;
                <EuiLink
                  href={createHref(history, {
                    query: {
                      kuery: `not ${fieldName}:"${fieldValue}"`,
                    },
                  })}
                >
                  <EuiIcon type="magnifyWithMinus" />
                </EuiLink> */}
              </>
            );
          },
        },
      ] as Array<EuiBasicTableColumn<ChangePoint>>;
    }, []);

  const { progress, response, startFetch, cancelFetch } = useChangePointDetection(
    indexPattern,
    spikeSelection
  );
  const status = progress.isRunning ? FETCH_STATUS.LOADING : FETCH_STATUS.SUCCESS;

  useEffect(() => {
    if (spikeSelection && !isInitialized) {
      startFetch();
      setIsInitialized(true);
    }
  }, [isInitialized, spikeSelection, startFetch]);

  const significantTerms = useMemo(
    () => orderBy(response.changePoints, 'normalizedScore', 'desc'),
    [response.changePoints]
  );

  const columns = failedTransactionsCorrelationsColumns;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { pagination, pageOfItems } = useMemo(() => {
    const pageStart = pageIndex * pageSize;

    const itemCount = significantTerms?.length ?? 0;
    return {
      pageOfItems: significantTerms?.slice(pageStart, pageStart + pageSize),
      pagination: {
        pageIndex,
        pageSize,
        totalItemCount: itemCount,
        pageSizeOptions: PAGINATION_SIZE_OPTIONS,
      },
    };
  }, [pageIndex, pageSize, significantTerms]);

  const onChange = useCallback((tableSettings) => {
    const { index, size } = tableSettings.page;

    setPageIndex(index);
    setPageSize(size);

    // onTableChange(tableSettings);
  }, []);

  const cpBarSeries = useMemo(
    () =>
      response.changePoints?.map((cp) => {
        return {
          ...cp,
          data:
            response?.overallTimeSeries?.map((o, i) => {
              const current = cp.histogram?.find((d) => d.key_as_string === o.key_as_string) ?? {
                doc_count: 0,
              };
              return {
                ...o,
                doc_count: current.doc_count,
                other: Math.max(0, o.doc_count - current.doc_count),
              };
            }) ?? [],
        };
      }) ?? [],
    [response.changePoints, response.overallTimeSeries]
  );

  const treeItems = useMemo(() => {
    let id = 1;
    const mapL = (d: ItemSetTreeNode): EuiTreeViewNode => {
      id = id + 1;
      return {
        label:
          `(q:${Math.round(d.quality() * 10000) / 10000})` +
          `(s:${d.selectedCluster()})` +
          Object.entries(d.itemSet.items)
            .map(([key, value]) => `${key}:${value.join('/')}`)
            .join(),
        id: `item_${id}`,
        icon: <EuiIcon size="s" type="folderClosed" />,
        iconWhenExpanded: <EuiIcon size="s" type="folderOpen" />,
        isExpanded: true,
        children: d.children().map(mapL),
      };
    };

    return (response?.tree && response?.tree.root.children().map(mapL)) ?? [];
  }, [response?.tree]);

  const tabs = [
    {
      id: 'saTable',
      name: 'Tabular',
      content: (
        <EuiBasicTable
          items={pageOfItems ?? []}
          noItemsMessage={status === FETCH_STATUS.LOADING ? loadingText : noDataText}
          loading={status === FETCH_STATUS.LOADING}
          // error={status === FETCH_STATUS.FAILURE ? errorMessage : ''}
          columns={columns}
          rowProps={(term) => {
            return {
              onClick: () => {
                // if (setPinnedSignificantTerm) {
                //   setPinnedSignificantTerm(term);
                // }
              },
              onMouseEnter: () => {
                // setSelectedSignificantTerm(term);
              },
              onMouseLeave: () => {
                // setSelectedSignificantTerm(null);
              },
              // style:
              //   selectedTerm &&
              //   selectedTerm.fieldValue === term.fieldValue &&
              //   selectedTerm.fieldName === term.fieldName
              //     ? {
              //         backgroundColor: euiTheme.eui.euiColorLightestShade,
              //       }
              //     : null,
            };
          }}
          pagination={pagination}
          onChange={onChange}
          // sorting={sorting}
        />
      ),
    },
    {
      id: 'saSmallMultiples',
      name: 'Time Series Charts',
      content: (
        <EuiFlexGroup wrap gutterSize="xs">
          {cpBarSeries.map((cp) => {
            return (
              <EuiFlexItem grow={false}>
                <EuiSplitPanel.Outer grow>
                  <EuiSplitPanel.Inner grow={false} paddingSize="s">
                    <div
                      style={{
                        width: '200px',
                        height: '50px',
                        // margin: '0px 0 16px 8px',
                      }}
                    >
                      <Chart>
                        <Settings theme={chartTheme} baseTheme={chartBaseTheme} />
                        <BarSeries
                          id="Other"
                          xScaleType={ScaleType.Time}
                          yScaleType={ScaleType.Linear}
                          xAccessor={'key'}
                          yAccessors={['other']}
                          data={cp.data}
                          stackAccessors={[0]}
                          // color={['lightblue']}
                        />
                        <BarSeries
                          id={`${cp.fieldName}:${cp.fieldValue}`}
                          xScaleType={ScaleType.Time}
                          yScaleType={ScaleType.Linear}
                          xAccessor={'key'}
                          yAccessors={['doc_count']}
                          data={cp.data}
                          stackAccessors={[0]}
                          color={['orange']}
                        />
                      </Chart>
                    </div>
                  </EuiSplitPanel.Inner>
                  <EuiSplitPanel.Inner
                    color="subdued"
                    paddingSize="s"
                    style={{ width: '200px', overflow: 'hidden' }}
                  >
                    <small>
                      <EuiStat title={cp.fieldValue} description={cp.fieldName} titleSize="xxxs" />
                    </small>
                  </EuiSplitPanel.Inner>
                </EuiSplitPanel.Outer>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      ),
    },
    {
      id: 'saTree',
      name: 'Tree',
      content: (
        <div style={{ width: '100%' }}>
          <EuiTreeView items={treeItems} aria-label="Sample Folder Tree" display="compressed" />
        </div>
      ),
    },
  ];

  return (
    <EuiFlexItem grow={false} style={{ height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '16px', overflow: 'scroll' }}>
        <ProgressControls
          progress={progress.loaded}
          progressMessage={progress.loadingState ?? ''}
          isRunning={progress.isRunning}
          onRefresh={startFetch}
          onCancel={cancelFetch}
        />
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[1]} autoFocus="selected" />
      </div>
    </EuiFlexItem>
  );
};
