/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import {
  DataView,
  DataViewField,
  ES_FIELD_TYPES,
  getEsQueryConfig,
  KBN_FIELD_TYPES,
} from '@kbn/data-plugin/common';
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
} from '@elastic/eui';
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
import { buildEsQuery, Query, Filter } from '@kbn/es-query';
import type { BucketedAggregation, FieldStatsResponse } from '../../../common/types';
import { FIELD_STATS_API_PATH } from '../../../common/constants';
import { useUnifiedFieldListServices } from '../../hooks/use_unified_field_list_services';

interface State {
  isLoading: boolean;
  totalDocuments?: number;
  sampledDocuments?: number;
  sampledValues?: number;
  histogram?: BucketedAggregation<number | string>;
  topValues?: BucketedAggregation<number | string>;
}

export interface FieldStatsProps {
  query: Query;
  filters: Filter[];
  fromDate: string;
  toDate: string;
  dataViewOrDataViewId: DataView | string;
  field: DataViewField;
  testSubject: string;
}

// TODO: catch errors during rendering

export const FieldStats: React.FC<FieldStatsProps> = ({
  query,
  filters,
  fromDate,
  toDate,
  dataViewOrDataViewId,
  field,
  testSubject,
}) => {
  const services = useUnifiedFieldListServices();
  const { http, fieldFormats, uiSettings, charts, dataViews } = services;
  const [state, setState] = useState<State>({
    isLoading: false,
  });
  const [dataView, setDataView] = useState<DataView | null>(null);

  async function fetchData() {
    // Range types don't have any useful stats we can show
    if (
      state.isLoading ||
      field.type === 'document' ||
      field.type.includes('range') ||
      field.type === 'geo_point' ||
      field.type === 'geo_shape'
    ) {
      return;
    }

    const loadedDataView =
      typeof dataViewOrDataViewId === 'string'
        ? await dataViews.get(dataViewOrDataViewId)
        : dataViewOrDataViewId;

    setDataView(loadedDataView);
    setState((s) => ({ ...s, isLoading: true }));

    http
      .post<FieldStatsResponse<string | number>>(FIELD_STATS_API_PATH, {
        body: JSON.stringify({
          dslQuery: buildEsQuery(loadedDataView, query, filters, getEsQueryConfig(uiSettings)),
          fromDate,
          toDate,
          fieldName: field.name,
          dataViewId: loadedDataView.id,
        }),
      })
      .then((results) => {
        setState((s) => ({
          ...s,
          isLoading: false,
          totalDocuments: results.totalDocuments,
          sampledDocuments: results.sampledDocuments,
          sampledValues: results.sampledValues,
          histogram: results.histogram,
          topValues: results.topValues,
        }));
      })
      .catch(() => {
        setState((s) => ({ ...s, isLoading: false }));
      });
  }

  useEffect(() => {
    fetchData();
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

  if (isLoading || !dataView) {
    return <EuiLoadingSpinner />;
  }

  const formatter = dataView.getFormatterForField(field);
  let title = <></>;

  if (field.type.includes('range')) {
    // TODO: new localization keys
    return (
      <>
        <EuiText size="s">
          {i18n.translate('xpack.lens.indexPattern.fieldStatsLimited', {
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
          {i18n.translate('xpack.lens.indexPattern.fieldStatsMurmur3Limited', {
            defaultMessage: `Summary information is not available for murmur3 fields.`,
          })}
        </EuiText>
      </>
    );
  }

  if (field.type === 'geo_point' || field.type === 'geo_shape') {
    return <>{/* TODO allow to add a custom view (Visualize)?*/}</>;
  }

  if (
    (!histogram || histogram.buckets.length === 0) &&
    (!topValues || topValues.buckets.length === 0)
  ) {
    const isUsingSampling = services.uiSettings.get('lens:useFieldExistenceSampling'); // TODO: what to do with this setting?
    return (
      <>
        <EuiText size="s">
          {isUsingSampling
            ? i18n.translate('xpack.lens.indexPattern.fieldStatsSamplingNoData', {
                defaultMessage:
                  'Lens is unable to create visualizations with this field because it does not contain data in the first 500 documents that match your filters. To create a visualization, drag and drop a different field.',
              })
            : i18n.translate('xpack.lens.indexPattern.fieldStatsNoData', {
                defaultMessage:
                  'Lens is unable to create visualizations with this field because it does not contain data. To create a visualization, drag and drop a different field.',
              })}
        </EuiText>
      </>
    );
  }

  if (histogram && histogram.buckets.length && topValues && topValues.buckets.length) {
    title = (
      <EuiButtonGroup
        className="lnsFieldItem__buttonGroup"
        buttonSize="compressed"
        isFullWidth
        legend={i18n.translate('xpack.lens.indexPattern.fieldStatsDisplayToggle', {
          defaultMessage: 'Toggle either the',
        })}
        options={[
          {
            label: i18n.translate('xpack.lens.indexPattern.fieldTopValuesLabel', {
              defaultMessage: 'Top values',
            }),
            id: 'topValues',
          },
          {
            label: i18n.translate('xpack.lens.indexPattern.fieldDistributionLabel', {
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
          {i18n.translate('xpack.lens.indexPattern.fieldTimeDistributionLabel', {
            defaultMessage: 'Time distribution',
          })}
        </h6>
      </EuiTitle>
    );
  } else if (topValues && topValues.buckets.length) {
    title = (
      <EuiTitle size="xxxs">
        <h6>
          {i18n.translate('xpack.lens.indexPattern.fieldTopValuesLabel', {
            defaultMessage: 'Top values',
          })}
        </h6>
      </EuiTitle>
    );
  }

  function combineWithTitleAndFooter(el: React.ReactElement) {
    return (
      <>
        {title ? title : <></>}

        <EuiSpacer size="s" />

        {el}

        <EuiSpacer />

        {totalDocuments ? (
          <EuiText color="subdued" size="xs">
            {sampledDocuments && (
              <>
                {i18n.translate('xpack.lens.indexPattern.percentageOfLabel', {
                  defaultMessage: '{percentage}% of',
                  values: {
                    percentage: Math.round((sampledDocuments / totalDocuments) * 100),
                  },
                })}
              </>
            )}{' '}
            <strong>
              {fieldFormats
                .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                .convert(totalDocuments)}
            </strong>{' '}
            {i18n.translate('xpack.lens.indexPattern.ofDocumentsLabel', {
              defaultMessage: 'documents',
            })}
          </EuiText>
        ) : (
          <></>
        )}
      </>
    );
  }

  if (histogram && histogram.buckets.length) {
    const specId = i18n.translate('xpack.lens.indexPattern.fieldStatsCountLabel', {
      defaultMessage: 'Count',
    });

    if (field.type === 'date') {
      return combineWithTitleAndFooter(
        <Chart data-test-subj={`${testSubject}-histogram`} size={{ height: 200, width: 300 - 32 }}>
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
        <Chart data-test-subj={`${testSubject}-histogram`} size={{ height: 200, width: '100%' }}>
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
      <div data-test-subj={`${testSubject}-topValues`}>
        {topValues.buckets.map((topValue) => {
          const formatted = formatter.convert(topValue.key);
          return (
            // TODO: move styles next to this file
            <div className="lnsFieldItem__topValue" key={topValue.key}>
              <EuiFlexGroup
                alignItems="stretch"
                key={topValue.key}
                gutterSize="xs"
                responsive={false}
              >
                <EuiFlexItem grow={true} className="eui-textTruncate">
                  {formatted === '' ? (
                    <EuiText size="xs" color="subdued">
                      <em>
                        {i18n.translate('xpack.lens.indexPattern.fieldPanelEmptyStringValue', {
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
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" textAlign="left" color="accent">
                    {(Math.round((topValue.count / sampledValues!) * 1000) / 10).toFixed(
                      digitsRequired ? 1 : 0
                    )}
                    %
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiProgress
                className="lnsFieldItem__topValueProgress"
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
                  {i18n.translate('xpack.lens.indexPattern.otherDocsLabel', {
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
              className="lnsFieldItem__topValueProgress"
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

  return <></>;
};
