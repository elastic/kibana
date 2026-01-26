/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { UnifiedHistogramFetch$Arguments } from '@kbn/unified-histogram/types';
import { UnifiedBreakdownFieldSelector } from '@kbn/unified-histogram';
import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  euiPaletteColorBlind,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { ChartSectionConfigurationExtensionParams } from '../../../../types';
import {
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../../../../application/main/state_management/redux';
import { internalStateActions } from '../../../../../application/main/state_management/redux';

interface ChartWithCustomButtonsProps extends ChartSectionProps {
  actions: ChartSectionConfigurationExtensionParams['actions'];
}

export const ChartWithCustomButtons = ({ actions, ...props }: ChartWithCustomButtonsProps) => {
  const { isComponentVisible, fetch$, fetchParams, onBrushEnd, renderToggleActions, services } =
    props;
  const { euiTheme } = useEuiTheme();
  const euiPalette = euiPaletteColorBlind();
  const { openInNewTab, updateESQLQuery } = actions;

  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);

  const handleBreakdownFieldChange = useCallback(
    (breakdownField: DataViewField | undefined) => {
      dispatch(updateAppState({ appState: { breakdownField: breakdownField?.name } }));
    },
    [dispatch, updateAppState]
  );

  const lensAttributes = useMemo(() => {
    const { dataView, query, timeInterval } = fetchParams;

    if (!dataView.isTimeBased() || !dataView.timeFieldName) return null;

    const LAYER_ID = 'exampleHistogramLayer';
    const columns = {
      date_column: {
        dataType: 'date',
        isBucketed: true,
        label: dataView.timeFieldName,
        operationType: 'date_histogram',
        params: { interval: timeInterval || 'auto' },
        scale: 'interval',
        sourceField: dataView.timeFieldName,
      },
      count_column: {
        dataType: 'number',
        isBucketed: false,
        label: 'Count of records',
        operationType: 'count',
        params: { format: { id: 'number', params: { decimals: 0 } } },
        scale: 'ratio',
        sourceField: '___records___',
      },
    };

    return {
      references: [
        {
          id: dataView.id || '',
          name: `indexpattern-datasource-layer-${LAYER_ID}`,
          type: 'index-pattern',
        },
      ],
      state: {
        adHocDataViews: {},
        datasourceStates: {
          formBased: {
            layers: {
              [LAYER_ID]: {
                columnOrder: ['date_column', 'count_column'],
                columns,
                indexPatternId: dataView.id,
              },
            },
          },
        },
        filters: [],
        internalReferences: [],
        query: query || { language: 'kuery', query: '' },
        visualization: {
          layers: [
            {
              accessors: ['count_column'],
              layerId: LAYER_ID,
              layerType: 'data',
              seriesType: 'bar_stacked',
              xAccessor: 'date_column',
              yConfig: [{ forAccessor: 'count_column', color: euiPalette[4] }],
            },
          ],
          legend: { isVisible: true, position: 'right' },
          preferredSeriesType: 'bar_stacked',
          showCurrentTimeMarker: true,
          valueLabels: 'hide',
        },
      },
      title: 'Histogram',
      visualizationType: 'lnsXY',
    } as Parameters<typeof services.lens.EmbeddableComponent>[0]['attributes'];
  }, [euiPalette, fetchParams, services]);

  const [externalAttributes, setExternalAttributes] = useState<
    Parameters<typeof services.lens.EmbeddableComponent>[0]['attributes'] | null
  >(null);

  useEffect(() => {
    const subscription = fetch$.subscribe(
      ({ lensVisServiceState }: UnifiedHistogramFetch$Arguments) => {
        if (lensVisServiceState?.visContext?.attributes) {
          setExternalAttributes(lensVisServiceState.visContext.attributes);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [fetch$]);

  const handleBrushEnd: NonNullable<LensEmbeddableInput['onBrushEnd']> = useCallback(
    (data) => {
      data.preventDefault();

      if (onBrushEnd) {
        onBrushEnd(data);
      } else if (data.range.length >= 2) {
        const [min, max] = data.range;
        const from = new Date(min).toISOString();
        const to = new Date(max).toISOString();
        services.data.query.timefilter.timefilter.setTime({
          from,
          to,
          mode: 'absolute',
        });
      }
    },
    [onBrushEnd, services.data.query.timefilter.timefilter]
  );

  const onLoad = useCallback(() => {}, []);

  if (!isComponentVisible) return null;

  const finalAttributes = externalAttributes || lensAttributes;

  const chartCss = css`
    flex-grow: 1;
    margin-block: ${euiTheme.size.xs};
    min-height: 200px;
    position: relative;
    & > div {
      height: 100%;
      position: absolute;
      width: 100%;
    }
  `;

  return (
    <EuiFlexGroup
      className="unifiedHistogram__chart"
      css={css`
        margin: ${euiTheme.size.s};
      `}
      direction="column"
      gutterSize="s"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" direction="row" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>{renderToggleActions()}</EuiFlexItem>
          {fetchParams.breakdown && (
            <EuiFlexItem grow={false}>
              <UnifiedBreakdownFieldSelector
                breakdown={fetchParams.breakdown}
                dataView={fetchParams.dataView}
                onBreakdownFieldChange={handleBreakdownFieldChange}
              />
            </EuiFlexItem>
          )}
          {updateESQLQuery && (
            <EuiFlexItem grow={false}>
              <EuiButton
                color="text"
                data-test-subj="exampleChartUpdateEsqlQuery"
                iconType="editorCodeBlock"
                onClick={() => updateESQLQuery('FROM my-example-logs | LIMIT 50')}
                size="s"
              >
                Update ES|QL query
              </EuiButton>
            </EuiFlexItem>
          )}
          {openInNewTab && (
            <EuiFlexItem grow={false}>
              <EuiButton
                color="text"
                data-test-subj="exampleChartOpenNewTab"
                iconType="popout"
                onClick={() =>
                  openInNewTab({
                    query: { esql: 'FROM my-example-logs | LIMIT 100' },
                    tabLabel: 'Example Logs Tab',
                    timeRange: {
                      from: 'now-1d',
                      to: 'now',
                    },
                  })
                }
                size="s"
              >
                Open new tab
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow>
        {finalAttributes ? (
          <div data-test-subj="exampleHistogramChart" css={chartCss}>
            <services.lens.EmbeddableComponent
              abortController={fetchParams.abortController}
              attributes={finalAttributes}
              executionContext={{ description: 'example chart' }}
              forceDSL={true}
              id="exampleHistogramLens"
              lastReloadRequestTime={fetchParams.lastReloadRequestTime}
              onBrushEnd={handleBrushEnd}
              noPadding={true}
              onLoad={onLoad}
              searchSessionId={fetchParams.searchSessionId}
              timeRange={fetchParams.timeRange}
              viewMode="view"
            />
          </div>
        ) : (
          <EuiFlexGroup alignItems="center" css={{ minHeight: 200 }} justifyContent="center">
            <EuiFlexItem grow={false}>Chart not available</EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
