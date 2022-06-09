/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './histogram.scss';
import moment from 'moment-timezone';
import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiText,
} from '@elastic/eui';
import dateMath from '@kbn/datemath';
import {
  ElementClickListener,
  XYBrushEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { useDiscoverServices } from '../../../../utils/use_discover_services';
import { DataCharts$, DataChartsMessage, DataTotalHits$ } from '../../utils/use_saved_search';
import { FetchStatus } from '../../../types';
import { useDataState } from '../../utils/use_data_state';
import { GetStateReturn } from '../../services/discover_state';

export interface DiscoverHistogramProps {
  savedSearchData$: DataCharts$;
  savedSearchDataTotalHits$: DataTotalHits$;
  timefilterUpdateHandler: (ranges: { from: number; to: number }) => void;
  stateContainer: GetStateReturn;
}

export function DiscoverHistogram({
  savedSearchData$,
  savedSearchDataTotalHits$,
  timefilterUpdateHandler,
  stateContainer,
  dataView,
}: DiscoverHistogramProps) {
  const { data, uiSettings, fieldFormats, lens } = useDiscoverServices();

  const dataState: DataChartsMessage = useDataState(savedSearchData$);

  const { bucketInterval } = dataState;

  const onBrushEnd = useCallback(
    ({ x }: XYBrushEvent) => {
      if (!x) {
        return;
      }
      const [from, to] = x;
      timefilterUpdateHandler({ from, to });
    },
    [timefilterUpdateHandler]
  );


  const { timefilter } = data.query.timefilter;

  const { from, to } = timefilter.getAbsoluteTime();
  const dateFormat = useMemo(() => uiSettings.get('dateFormat'), [uiSettings]);

  const toMoment = useCallback(
    (datetime: moment.Moment | undefined) => {
      if (!datetime) {
        return '';
      }
      if (!dateFormat) {
        return String(datetime);
      }
      return datetime.format(dateFormat);
    },
    [dateFormat]
  );

  const timeRangeText = useMemo(() => {
    const timeRange = {
      from: dateMath.parse(from),
      to: dateMath.parse(to, { roundUp: true }),
    };
    const intervalText = i18n.translate('discover.histogramTimeRangeIntervalDescription', {
      defaultMessage: '(interval: {value})',
      values: {
        value: `${
          stateContainer.appStateContainer.getState().interval === 'auto'
            ? `${i18n.translate('discover.histogramTimeRangeIntervalAuto', {
                defaultMessage: 'Auto',
              })} - `
            : ''
        }${bucketInterval?.description}`,
      },
    });
    return `${toMoment(timeRange.from)} - ${toMoment(timeRange.to)} ${intervalText}`;
  }, [from, to, toMoment, bucketInterval, stateContainer]);


  const toolTipTitle = i18n.translate('discover.timeIntervalWithValueWarning', {
    defaultMessage: 'Warning',
  });

  const toolTipContent = i18n.translate('discover.bucketIntervalTooltip', {
    defaultMessage:
      'This interval creates {bucketsDescription} to show in the selected time range, so it has been scaled to {bucketIntervalDescription}.',
    values: {
      bucketsDescription:
        bucketInterval!.scale && bucketInterval!.scale > 1
          ? i18n.translate('discover.bucketIntervalTooltip.tooLargeBucketsText', {
              defaultMessage: 'buckets that are too large',
            })
          : i18n.translate('discover.bucketIntervalTooltip.tooManyBucketsText', {
              defaultMessage: 'too many buckets',
            }),
      bucketIntervalDescription: bucketInterval?.description,
    },
  });

  let timeRange = (
    <EuiText size="xs" className="dscHistogramTimeRange" textAlign="center">
      {timeRangeText}
    </EuiText>
  );
  if (bucketInterval?.scaled) {
    timeRange = (
      <EuiFlexGroup
        alignItems="baseline"
        justifyContent="center"
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem grow={false}>{timeRange}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip type="alert" color="warning" title={toolTipTitle} content={toolTipContent} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const LensComponent = lens.EmbeddableComponent;

  return (
    <React.Fragment>
      <div className="dscHistogram" data-test-subj="discoverChart" data-time-range={timeRangeText}>
        <LensComponent
          id=""
          viewMode="view"
          style={{ height: '100%' }}
          onBrushEnd={onBrushEnd}
          timeRange={{ from, to }}
          onLoad={(_, activeData) => {
            if (!activeData) return;
            savedSearchDataTotalHits$.next({
               fetchStatus: FetchStatus.COMPLETE,
               result: activeData?.layer1?.meta?.statistics?.totalCount
            });
          }}
          attributes={{
            title: 'Prefilled from example app',
            references: [
              {
                id: dataView.id,
                name: 'indexpattern-datasource-current-indexpattern',
                type: 'index-pattern',
              },
              {
                id: dataView.id,
                name: 'indexpattern-datasource-layer-layer1',
                type: 'index-pattern',
              },
            ],
            state: {
              datasourceStates: {
                indexpattern: {
                  layers: {
                    layer1: {
                      columnOrder: ['col1', 'col2'],
                      columns: {
                        col2: {
                          dataType: 'number',
                          isBucketed: false,
                          label: 'Count of records',
                          operationType: 'count',
                          scale: 'ratio',
                          sourceField: '___records___',
                        },
                        col1: {
                          dataType: 'date',
                          isBucketed: true,
                          label: dataView.timeFieldName,
                          operationType: 'date_histogram',
                          params: {
                            interval:
                              stateContainer.appStateContainer.getState().interval || 'auto',
                          },
                          scale: 'interval',
                          sourceField: dataView.timeFieldName,
                        },
                      },
                    },
                  },
                },
              },
              filters: stateContainer.appStateContainer.getState().filters || [],
              query: stateContainer.appStateContainer.getState().query || {
                language: 'kuery',
                query: '',
              },
              visualization: {
                axisTitlesVisibilitySettings: {
                  x: false,
                  yLeft: false,
                  yRight: true,
                },
                fittingFunction: 'None',
                gridlinesVisibilitySettings: {
                  x: true,
                  yLeft: true,
                  yRight: true,
                },
                layers: [
                  {
                    accessors: ['col2'],
                    layerId: 'layer1',
                    layerType: 'data',
                    seriesType: 'bar_stacked',
                    xAccessor: 'col1',
                    yConfig: [
                      {
                        forAccessor: 'col2',
                        color: 'green',
                      },
                    ],
                  },
                ],
                legend: {
                  isVisible: true,
                  position: 'right',
                },
                preferredSeriesType: 'bar_stacked',
                tickLabelsVisibilitySettings: {
                  x: true,
                  yLeft: true,
                  yRight: true,
                },
                valueLabels: 'hide',
              },
            },
            visualizationType: 'lnsXY',
          }}
        />
      </div>
      {timeRange}
    </React.Fragment>
  );
}
