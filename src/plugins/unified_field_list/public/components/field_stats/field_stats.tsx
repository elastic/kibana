/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type DataView,
  type DataViewField,
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
import { EuiButtonGroup, EuiLoadingSpinner, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
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
import { OverrideFieldTopValueBarCallback } from './field_top_values_bucket';
import type { BucketedAggregation } from '../../../common/types';
import { canProvideStatsForField } from '../../../common/utils/field_stats_utils';
import { loadFieldStats } from '../../services/field_stats';
import type { AddFieldFilterHandler } from '../../types';
import {
  FieldTopValues,
  getOtherCount,
  getBucketsValuesCount,
  getDefaultColor,
} from './field_top_values';
import { FieldSummaryMessage } from './field_summary_message';

export interface FieldStatsState {
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

interface FieldStatsPropsBase {
  services: FieldStatsServices;
  /** ISO formatted date string **/
  fromDate: string;
  /** ISO formatted date string **/
  toDate: string;
  dataViewOrDataViewId: DataView | string;
  field: DataViewField;
  color?: string;
  'data-test-subj'?: string;
  overrideMissingContent?: (params: {
    element: JSX.Element;
    reason: 'no-data' | 'unsupported';
  }) => JSX.Element | null;
  overrideFooter?: (params: {
    element: JSX.Element;
    totalDocuments?: number;
    sampledDocuments?: number;
  }) => JSX.Element;
  onAddFilter?: AddFieldFilterHandler;
  overrideFieldTopValueBar?: OverrideFieldTopValueBarCallback;
  onStateChange?: (s: FieldStatsState) => void;
}

export interface FieldStatsWithKbnQuery extends FieldStatsPropsBase {
  /** If Kibana-supported query is provided, it will be converted to dsl query **/
  query: Query | AggregateQuery;
  filters: Filter[];
  dslQuery?: never;
}

export interface FieldStatsWithDslQuery extends FieldStatsPropsBase {
  query?: never;
  filters?: never;
  /** If dsl query is provided, use it directly in searches **/
  dslQuery: object;
}

export type FieldStatsProps = FieldStatsWithKbnQuery | FieldStatsWithDslQuery;

const FieldStatsComponent: React.FC<FieldStatsProps> = ({
  services,
  query,
  dslQuery,
  filters,
  fromDate,
  toDate,
  dataViewOrDataViewId,
  field,
  color = getDefaultColor(),
  'data-test-subj': dataTestSubject = 'fieldStats',
  overrideMissingContent,
  overrideFooter,
  onAddFilter,
  overrideFieldTopValueBar,
  onStateChange,
}) => {
  const { fieldFormats, uiSettings, charts, dataViews, data } = services;
  const [state, changeState] = useState<FieldStatsState>({
    isLoading: false,
  });
  const [dataView, changeDataView] = useState<DataView | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCanceledRef = useRef<boolean>(false);

  const setState: typeof changeState = useCallback(
    (nextState) => {
      if (!isCanceledRef.current) {
        changeState(nextState);
      }
    },
    [changeState, isCanceledRef]
  );

  useEffect(
    function broadcastOnStateChange() {
      if (onStateChange) {
        onStateChange(state);
      }
    },
    [onStateChange, state]
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

      if (state.isLoading) {
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
        dslQuery:
          dslQuery ??
          buildEsQuery(loadedDataView, query ?? [], filters ?? [], getEsQueryConfig(uiSettings)),
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
  const customChartTheme: typeof chartTheme = useMemo(() => {
    return color
      ? {
          ...chartTheme,
          barSeriesStyle: {
            ...chartTheme.barSeriesStyle,
            rect: {
              ...(chartTheme.barSeriesStyle?.rect || {}),
              fill: color,
            },
          },
        }
      : chartTheme;
  }, [chartTheme, color]);

  const { isLoading, histogram, topValues, sampledValues, sampledDocuments, totalDocuments } =
    state;

  let histogramDefault = !!state.histogram;
  const fromDateParsed = DateMath.parse(fromDate);
  const toDateParsed = DateMath.parse(toDate);

  const bucketsValuesCount = getBucketsValuesCount(topValues?.buckets);
  const otherCount = getOtherCount(bucketsValuesCount, sampledValues!);

  if (
    bucketsValuesCount &&
    histogram &&
    histogram.buckets.length &&
    topValues &&
    topValues.buckets.length
  ) {
    // Default to histogram when top values are less than 10% of total
    histogramDefault = otherCount / bucketsValuesCount > 0.9;
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

  function combineWithTitleAndFooter(el: React.ReactElement) {
    const countsElement = totalDocuments ? (
      <EuiText color="subdued" size="xs" data-test-subj={`${dataTestSubject}-statsFooter`}>
        {sampledDocuments && sampledDocuments < totalDocuments ? (
          <FormattedMessage
            id="unifiedFieldList.fieldStats.calculatedFromSampleRecordsLabel"
            defaultMessage="Calculated from {sampledDocumentsFormatted} sample {sampledDocuments, plural, one {record} other {records}}."
            values={{
              sampledDocuments,
              sampledDocumentsFormatted: (
                <strong>
                  {fieldFormats
                    .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                    .convert(sampledDocuments)}
                </strong>
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="unifiedFieldList.fieldStats.calculatedFromTotalRecordsLabel"
            defaultMessage="Calculated from {totalDocumentsFormatted} {totalDocuments, plural, one {record} other {records}}."
            values={{
              totalDocuments,
              totalDocumentsFormatted: (
                <strong>
                  {fieldFormats
                    .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                    .convert(totalDocuments)}
                </strong>
              ),
            }}
          />
        )}
      </EuiText>
    ) : (
      <></>
    );

    return (
      <>
        {title ? <div data-test-subj={`${dataTestSubject}-title`}>{title}</div> : <></>}

        <EuiSpacer size="s" />

        {el}

        {overrideFooter ? (
          overrideFooter?.({ element: countsElement, totalDocuments, sampledDocuments })
        ) : (
          <>
            <EuiSpacer size="m" />
            {countsElement}
          </>
        )}
      </>
    );
  }

  if (!canProvideStatsForField(field)) {
    const messageNoAnalysis = (
      <FieldSummaryMessage
        message={i18n.translate('unifiedFieldList.fieldStats.notAvailableForThisFieldDescription', {
          defaultMessage: 'Analysis is not available for this field.',
        })}
      />
    );

    return overrideMissingContent
      ? overrideMissingContent({
          reason: 'unsupported',
          element: messageNoAnalysis,
        })
      : messageNoAnalysis;
  }

  if (
    (!histogram || histogram.buckets.length === 0) &&
    (!topValues || topValues.buckets.length === 0)
  ) {
    const messageNoData =
      sampledDocuments && totalDocuments && sampledDocuments < totalDocuments ? (
        <FieldSummaryMessage
          message={i18n.translate('unifiedFieldList.fieldStats.noFieldDataInSampleDescription', {
            defaultMessage:
              'No field data for {sampledDocumentsFormatted} sample {sampledDocuments, plural, one {record} other {records}}.',
            values: {
              sampledDocuments,
              sampledDocumentsFormatted: fieldFormats
                .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                .convert(sampledDocuments),
            },
          })}
        />
      ) : (
        <FieldSummaryMessage
          message={i18n.translate('unifiedFieldList.fieldStats.noFieldDataDescription', {
            defaultMessage: 'No field data for the current search.',
          })}
        />
      );

    return overrideMissingContent
      ? overrideMissingContent({
          reason: 'no-data',
          element: messageNoData,
        })
      : messageNoData;
  }

  if (histogram && histogram.buckets.length && topValues && topValues.buckets.length) {
    title = (
      <>
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
              'data-test-subj': `${dataTestSubject}-buttonGroup-topValuesButton`,
            },
            {
              label: i18n.translate('unifiedFieldList.fieldStats.fieldDistributionLabel', {
                defaultMessage: 'Distribution',
              }),
              id: 'histogram',
              'data-test-subj': `${dataTestSubject}-buttonGroup-distributionButton`,
            },
          ]}
          onChange={(optionId: string) => {
            setShowingHistogram(optionId === 'histogram');
          }}
          idSelected={showingHistogram ? 'histogram' : 'topValues'}
        />
        <EuiSpacer size="xs" />
      </>
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
          {field.aggregatable
            ? i18n.translate('unifiedFieldList.fieldStats.topValuesLabel', {
                defaultMessage: 'Top values',
              })
            : i18n.translate('unifiedFieldList.fieldStats.examplesLabel', {
                defaultMessage: 'Examples',
              })}
        </h6>
      </EuiTitle>
    );
  }

  if (histogram && histogram.buckets.length) {
    const specId = i18n.translate('unifiedFieldList.fieldStats.countLabel', {
      defaultMessage: 'Count',
    });

    if (field.type === 'date') {
      return combineWithTitleAndFooter(
        <div data-test-subj={`${dataTestSubject}-histogram`}>
          <Chart size={{ height: 200, width: 300 - 32 }}>
            <Settings
              tooltip={{ type: TooltipType.None }}
              theme={customChartTheme}
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
        </div>
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
            theme={customChartTheme}
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
    return combineWithTitleAndFooter(
      <FieldTopValues
        buckets={topValues.buckets}
        dataView={dataView}
        field={field}
        sampledValuesCount={sampledValues!}
        color={color}
        data-test-subj={dataTestSubject}
        onAddFilter={onAddFilter}
        overrideFieldTopValueBar={overrideFieldTopValueBar}
      />
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
