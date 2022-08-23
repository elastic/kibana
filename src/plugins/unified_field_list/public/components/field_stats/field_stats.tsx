/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DataView,
  DataViewField,
  ES_FIELD_TYPES,
  getEsQueryConfig,
  KBN_FIELD_TYPES,
} from '@kbn/data-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import DateMath from '@kbn/datemath';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  Axis,
  Chart,
  HistogramBarSeries,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  TooltipType,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { buildEsQuery, Query, Filter, AggregateQuery } from '@kbn/es-query';
import type { BucketedAggregation } from '../../../common/types';
import { canProvideStatsForField } from '../../../common/utils/field_stats_utils';
import { loadFieldStats } from '../../services/field_stats';

interface State {
  isLoading: boolean;
  totalDocuments?: number;
  sampledDocuments?: number;
  sampledValues?: number;
  histogram?: BucketedAggregation<number | string>;
  topValues?: BucketedAggregation<number | string>;
}

export interface FieldStatsServices {
  uiSettings: IUiSettingsClient;
  dataViews: DataViewsContract;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  charts: ChartsPluginSetup;
}

export interface FieldStatsProps {
  services: FieldStatsServices;
  query: Query | AggregateQuery;
  filters: Filter[];
  fromDate: string;
  toDate: string;
  dataViewOrDataViewId: DataView | string;
  field: DataViewField;
  'data-test-subj'?: string;
  overrideMissingContent?: (params?: { noDataFound?: boolean }) => JSX.Element | null;
  overrideFooter?: (params: {
    element: JSX.Element;
    totalDocuments?: number;
    sampledDocuments?: number;
  }) => JSX.Element;
}

const FieldStatsComponent: React.FC<FieldStatsProps> = ({
  services,
  query,
  filters,
  fromDate,
  toDate,
  dataViewOrDataViewId,
  field,
  'data-test-subj': dataTestSubject = 'fieldStats',
  overrideMissingContent,
  overrideFooter,
}) => {
  const { euiTheme } = useEuiTheme();
  const { fieldFormats, uiSettings, charts, dataViews, data } = services;
  const [state, changeState] = useState<State>({
    isLoading: false,
  });
  const [dataView, changeDataView] = useState<DataView | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCanceledRef = useRef<boolean>(false);

  const topValueStyles = useMemo(
    () => css`
      margin-bottom: ${euiTheme.size.s};

      &:last-of-type {
        margin-bottom: 0;
      }
    `,
    [euiTheme]
  );

  const topValueProgressStyles = useMemo(
    () => css`
      background-color: ${euiTheme.colors.lightestShade};

      &::-webkit-progress-bar {
        background-color: ${euiTheme.colors.lightestShade};
      }
    `,
    [euiTheme]
  );

  const setState: typeof changeState = useCallback(
    (nextState) => {
      if (!isCanceledRef.current) {
        changeState(nextState);
      }
    },
    [changeState, isCanceledRef]
  );

  const setDataView: typeof changeDataView = useCallback(
    (nextDataView) => {
      if (!isCanceledRef.current) {
        changeDataView(nextDataView);
      }
    },
    [changeDataView, isCanceledRef]
  );

  async function fetchData() {
    if (isCanceledRef.current) {
      return;
    }

    try {
      const loadedDataView =
        typeof dataViewOrDataViewId === 'string'
          ? await dataViews.get(dataViewOrDataViewId)
          : dataViewOrDataViewId;

      setDataView(loadedDataView);

      if (state.isLoading || !canProvideStatsForField(field)) {
        return;
      }

      setState((s) => ({ ...s, isLoading: true }));

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const results = await loadFieldStats({
        services: { data },
        dataView: loadedDataView,
        field,
        fromDate,
        toDate,
        dslQuery: buildEsQuery(loadedDataView, query, filters, getEsQueryConfig(uiSettings)),
        abortController: abortControllerRef.current,
      });

      abortControllerRef.current = null;

      setState((s) => ({
        ...s,
        isLoading: false,
        totalDocuments: results.totalDocuments,
        sampledDocuments: results.sampledDocuments,
        sampledValues: results.sampledValues,
        histogram: results.histogram,
        topValues: results.topValues,
      }));
    } catch (e) {
      // console.error(e);
      setState((s) => ({ ...s, isLoading: false }));
    }
  }

  useEffect(() => {
    fetchData();

    return () => {
      isCanceledRef.current = true;
      abortControllerRef.current?.abort();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const chartTheme = charts.theme.useChartsTheme();
  const chartBaseTheme = charts.theme.useChartsBaseTheme();

  const { isLoading, histogram, topValues, sampledValues, sampledDocuments, totalDocuments } =
    state;

  let histogramDefault = !!state.histogram;
  const fromDateParsed = DateMath.parse(fromDate);
  const toDateParsed = DateMath.parse(toDate);

  const totalValuesCount =
    topValues && topValues.buckets.reduce((prev, bucket) => bucket.count + prev, 0);
  const otherCount = sampledValues && totalValuesCount ? sampledValues - totalValuesCount : 0;

  if (
    totalValuesCount &&
    histogram &&
    histogram.buckets.length &&
    topValues &&
    topValues.buckets.length
  ) {
    // Default to histogram when top values are less than 10% of total
    histogramDefault = otherCount / totalValuesCount > 0.9;
  }

  const [showingHistogram, setShowingHistogram] = useState(histogramDefault);

  if (isLoading) {
    return <EuiLoadingSpinner />;
  }

  if (!dataView) {
    return null;
  }

  const formatter = dataView.getFormatterForField(field);
  let title = <></>;

  if (field.type.includes('range')) {
    return (
      <>
        <EuiText size="s">
          {i18n.translate('unifiedFieldList.fieldStats.notAvailableForRangeFieldDescription', {
            defaultMessage: `Summary information is not available for range type fields.`,
          })}
        </EuiText>
      </>
    );
  }

  if (field.type === 'murmur3') {
    return (
      <>
        <EuiText size="s">
          {i18n.translate('unifiedFieldList.fieldStats.notAvailableForMurmur3FieldDescription', {
            defaultMessage: `Summary information is not available for murmur3 fields.`,
          })}
        </EuiText>
      </>
    );
  }

  if (field.type === 'geo_point' || field.type === 'geo_shape') {
    return overrideMissingContent ? overrideMissingContent() : null;
  }

  if (
    (!histogram || histogram.buckets.length === 0) &&
    (!topValues || topValues.buckets.length === 0)
  ) {
    return overrideMissingContent ? overrideMissingContent({ noDataFound: true }) : null;
  }

  if (histogram && histogram.buckets.length && topValues && topValues.buckets.length) {
    title = (
      <EuiButtonGroup
        buttonSize="compressed"
        isFullWidth
        legend={i18n.translate('unifiedFieldList.fieldStats.displayToggleLegend', {
          defaultMessage: 'Toggle either the',
        })}
        options={[
          {
            label: i18n.translate('unifiedFieldList.fieldStats.topValuesLabel', {
              defaultMessage: 'Top values',
            }),
            id: 'topValues',
          },
          {
            label: i18n.translate('unifiedFieldList.fieldStats.fieldDistributionLabel', {
              defaultMessage: 'Distribution',
            }),
            id: 'histogram',
          },
        ]}
        onChange={(optionId: string) => {
          setShowingHistogram(optionId === 'histogram');
        }}
        idSelected={showingHistogram ? 'histogram' : 'topValues'}
      />
    );
  } else if (field.type === 'date') {
    title = (
      <EuiTitle size="xxxs">
        <h6>
          {i18n.translate('unifiedFieldList.fieldStats.fieldTimeDistributionLabel', {
            defaultMessage: 'Time distribution',
          })}
        </h6>
      </EuiTitle>
    );
  } else if (topValues && topValues.buckets.length) {
    title = (
      <EuiTitle size="xxxs">
        <h6>
          {i18n.translate('unifiedFieldList.fieldStats.topValuesLabel', {
            defaultMessage: 'Top values',
          })}
        </h6>
      </EuiTitle>
    );
  }

  function combineWithTitleAndFooter(el: React.ReactElement) {
    const countsElement = totalDocuments ? (
      <EuiText color="subdued" size="xs" data-test-subj={`${dataTestSubject}-statsFooter`}>
        {sampledDocuments && (
          <>
            {i18n.translate('unifiedFieldList.fieldStats.percentageOfLabel', {
              defaultMessage: '{percentage}% of',
              values: {
                percentage: Math.round((sampledDocuments / totalDocuments) * 100),
              },
            })}{' '}
          </>
        )}
        <strong>
          {fieldFormats
            .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
            .convert(totalDocuments)}
        </strong>{' '}
        {i18n.translate('unifiedFieldList.fieldStats.ofDocumentsLabel', {
          defaultMessage: 'documents',
        })}
      </EuiText>
    ) : (
      <></>
    );

    return (
      <>
        {title ? title : <></>}

        <EuiSpacer size="s" />

        {el}

        {overrideFooter ? (
          overrideFooter?.({ element: countsElement, totalDocuments, sampledDocuments })
        ) : (
          <>
            <EuiSpacer />
            {countsElement}
          </>
        )}
      </>
    );
  }

  if (histogram && histogram.buckets.length) {
    const specId = i18n.translate('unifiedFieldList.fieldStats.countLabel', {
      defaultMessage: 'Count',
    });

    if (field.type === 'date') {
      return combineWithTitleAndFooter(
        <Chart
          data-test-subj={`${dataTestSubject}-histogram`}
          size={{ height: 200, width: 300 - 32 }}
        >
          <Settings
            tooltip={{ type: TooltipType.None }}
            theme={chartTheme}
            baseTheme={chartBaseTheme}
            xDomain={
              fromDateParsed && toDateParsed
                ? {
                    min: fromDateParsed.valueOf(),
                    max: toDateParsed.valueOf(),
                    minInterval: Math.round(
                      (toDateParsed.valueOf() - fromDateParsed.valueOf()) / 10
                    ),
                  }
                : undefined
            }
          />

          <Axis
            id="key"
            position={Position.Bottom}
            tickFormat={
              fromDateParsed && toDateParsed
                ? niceTimeFormatter([fromDateParsed.valueOf(), toDateParsed.valueOf()])
                : undefined
            }
            showOverlappingTicks={true}
          />

          <HistogramBarSeries
            data={histogram.buckets}
            id={specId}
            xAccessor={'key'}
            yAccessors={['count']}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            timeZone="local"
          />
        </Chart>
      );
    }

    if (showingHistogram || !topValues || !topValues.buckets.length) {
      return combineWithTitleAndFooter(
        <Chart
          data-test-subj={`${dataTestSubject}-histogram`}
          size={{ height: 200, width: '100%' }}
        >
          <Settings
            rotation={90}
            tooltip={{ type: TooltipType.None }}
            theme={chartTheme}
            baseTheme={chartBaseTheme}
          />

          <Axis
            id="key"
            position={Position.Left}
            showOverlappingTicks={true}
            tickFormat={(d) => formatter.convert(d)}
          />

          <HistogramBarSeries
            data={histogram.buckets}
            id={specId}
            xAccessor={'key'}
            yAccessors={['count']}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
          />
        </Chart>
      );
    }
  }

  if (topValues && topValues.buckets.length) {
    const digitsRequired = topValues.buckets.some(
      (topValue) => !Number.isInteger(topValue.count / sampledValues!)
    );
    return combineWithTitleAndFooter(
      <div data-test-subj={`${dataTestSubject}-topValues`}>
        {topValues.buckets.map((topValue) => {
          const formatted = formatter.convert(topValue.key);
          return (
            <div css={topValueStyles} key={topValue.key}>
              <EuiFlexGroup
                alignItems="stretch"
                key={topValue.key}
                gutterSize="xs"
                responsive={false}
              >
                <EuiFlexItem
                  grow={true}
                  className="eui-textTruncate"
                  data-test-subj={`${dataTestSubject}-topValues-value`}
                >
                  {formatted === '' ? (
                    <EuiText size="xs" color="subdued">
                      <em>
                        {i18n.translate('unifiedFieldList.fieldStats.emptyStringValueLabel', {
                          defaultMessage: 'Empty string',
                        })}
                      </em>
                    </EuiText>
                  ) : (
                    <EuiToolTip content={formatted} delay="long">
                      <EuiText size="xs" color="subdued" className="eui-textTruncate">
                        {formatted}
                      </EuiText>
                    </EuiToolTip>
                  )}
                </EuiFlexItem>
                <EuiFlexItem
                  grow={false}
                  data-test-subj={`${dataTestSubject}-topValues-valueCount`}
                >
                  <EuiText size="xs" textAlign="left" color="accent">
                    {(Math.round((topValue.count / sampledValues!) * 1000) / 10).toFixed(
                      digitsRequired ? 1 : 0
                    )}
                    %
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiProgress
                css={topValueProgressStyles}
                value={topValue.count / sampledValues!}
                max={1}
                size="s"
                color="accent"
              />
            </div>
          );
        })}
        {otherCount ? (
          <>
            <EuiFlexGroup alignItems="stretch" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={true} className="eui-textTruncate">
                <EuiText size="xs" className="eui-textTruncate" color="subdued">
                  {i18n.translate('unifiedFieldList.fieldStats.otherDocsLabel', {
                    defaultMessage: 'Other',
                  })}
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem grow={false} className="eui-textTruncate">
                <EuiText size="xs" color="subdued">
                  {(Math.round((otherCount / sampledValues!) * 1000) / 10).toFixed(
                    digitsRequired ? 1 : 0
                  )}
                  %
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiProgress
              css={topValueProgressStyles}
              value={otherCount / sampledValues!}
              max={1}
              size="s"
              color="subdued"
            />
          </>
        ) : (
          <></>
        )}
      </div>
    );
  }

  return null;
};

class ErrorBoundary extends React.Component<{}, { hasError: boolean }> {
  constructor(props: FieldStatsProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // componentDidCatch(error, errorInfo) {
  //   console.log(error, errorInfo);
  // }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

/**
 * Component which fetches and renders stats for a data view field
 * @param props
 * @constructor
 */
const FieldStats: React.FC<FieldStatsProps> = (props) => {
  return (
    <ErrorBoundary>
      <FieldStatsComponent {...props} />
    </ErrorBoundary>
  );
};

// Necessary for React.lazy
// eslint-disable-next-line import/no-default-export
export default FieldStats;
