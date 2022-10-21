/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { memo, ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import moment from 'moment';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import {
  getVisualizeInformation,
  triggerVisualizeActions,
} from '@kbn/unified-field-list-plugin/public';
import { HitsCounter } from '../hits_counter';
import { GetStateReturn } from '../../services/discover_state';
import { DiscoverHistogram } from './histogram';
import { DataCharts$, DataTotalHits$ } from '../../hooks/use_saved_search';
import { useChartPanels } from './use_chart_panels';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getUiActions } from '../../../../kibana_services';
import { PLUGIN_ID } from '../../../../../common';

const DiscoverHistogramMemoized = memo(DiscoverHistogram);
export const CHART_HIDDEN_KEY = 'discover:chartHidden';

export function DiscoverChart({
  className,
  resetSavedSearch,
  savedSearch,
  savedSearchDataChart$,
  savedSearchDataTotalHits$,
  stateContainer,
  dataView,
  hideChart,
  interval,
  isTimeBased,
  appendHistogram,
  onResetChartHeight,
}: {
  className?: string;
  resetSavedSearch: () => void;
  savedSearch: SavedSearch;
  savedSearchDataChart$: DataCharts$;
  savedSearchDataTotalHits$: DataTotalHits$;
  stateContainer: GetStateReturn;
  dataView: DataView;
  isTimeBased: boolean;
  hideChart?: boolean;
  interval?: string;
  appendHistogram?: ReactElement;
  onResetChartHeight?: () => void;
}) {
  const { data, storage } = useDiscoverServices();
  const [showChartOptionsPopover, setShowChartOptionsPopover] = useState(false);

  const chartRef = useRef<{ element: HTMLElement | null; moveFocus: boolean }>({
    element: null,
    moveFocus: false,
  });

  const timeField = dataView.timeFieldName && dataView.getFieldByName(dataView.timeFieldName);
  const [canVisualize, setCanVisualize] = useState(false);

  useEffect(() => {
    if (!timeField) return;
    getVisualizeInformation(
      getUiActions(),
      timeField,
      dataView,
      savedSearch.columns || [],
      []
    ).then((info) => {
      setCanVisualize(Boolean(info));
    });
  }, [dataView, savedSearch.columns, timeField]);

  const onEditVisualization = useCallback(() => {
    if (!timeField) {
      return;
    }
    triggerVisualizeActions(
      getUiActions(),
      timeField,
      savedSearch.columns || [],
      PLUGIN_ID,
      dataView
    );
  }, [dataView, savedSearch.columns, timeField]);

  const onShowChartOptions = useCallback(() => {
    setShowChartOptionsPopover(!showChartOptionsPopover);
  }, [showChartOptionsPopover]);

  const closeChartOptions = useCallback(() => {
    setShowChartOptionsPopover(false);
  }, [setShowChartOptionsPopover]);

  useEffect(() => {
    if (chartRef.current.moveFocus && chartRef.current.element) {
      chartRef.current.element.focus();
    }
  }, [hideChart]);

  const toggleHideChart = useCallback(() => {
    const newHideChart = !hideChart;
    chartRef.current.moveFocus = !newHideChart;
    storage.set(CHART_HIDDEN_KEY, newHideChart);
    stateContainer.setAppState({ hideChart: newHideChart });
  }, [hideChart, stateContainer, storage]);

  const timefilterUpdateHandler = useCallback(
    (ranges: { from: number; to: number }) => {
      data.query.timefilter.timefilter.setTime({
        from: moment(ranges.from).toISOString(),
        to: moment(ranges.to).toISOString(),
        mode: 'absolute',
      });
    },
    [data]
  );
  const panels = useChartPanels({
    toggleHideChart,
    onChangeInterval: (newInterval) => stateContainer.setAppState({ interval: newInterval }),
    closePopover: () => setShowChartOptionsPopover(false),
    onResetChartHeight,
    hideChart,
    interval,
  });

  return (
    <EuiFlexGroup
      className={className}
      direction="column"
      alignItems="stretch"
      gutterSize="none"
      responsive={false}
    >
      <EuiFlexItem grow={false} className="dscResultCount">
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
          <EuiFlexItem
            grow={false}
            className="dscResultCount__title eui-textTruncate eui-textNoWrap"
          >
            <HitsCounter
              savedSearchData$={savedSearchDataTotalHits$}
              showResetButton={!!(savedSearch && savedSearch.id)}
              onResetQuery={resetSavedSearch}
            />
          </EuiFlexItem>
          {isTimeBased && (
            <EuiFlexItem className="dscResultCount__toggle" grow={false}>
              <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
                {canVisualize && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.translate('discover.editVisualizationButton', {
                        defaultMessage: 'Edit visualization',
                      })}
                    >
                      <EuiButtonIcon
                        size="xs"
                        iconType="lensApp"
                        onClick={onEditVisualization}
                        data-test-subj="discoverEditVisualization"
                        aria-label={i18n.translate('discover.editVisualizationButton', {
                          defaultMessage: 'Edit visualization',
                        })}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    id="dscChartOptions"
                    button={
                      <EuiToolTip
                        content={i18n.translate('discover.chartOptionsButton', {
                          defaultMessage: 'Chart options',
                        })}
                      >
                        <EuiButtonIcon
                          size="xs"
                          iconType="gear"
                          onClick={onShowChartOptions}
                          data-test-subj="discoverChartOptionsToggle"
                          aria-label={i18n.translate('discover.chartOptionsButton', {
                            defaultMessage: 'Chart options',
                          })}
                        />
                      </EuiToolTip>
                    }
                    isOpen={showChartOptionsPopover}
                    closePopover={closeChartOptions}
                    panelPaddingSize="none"
                    anchorPosition="downLeft"
                  >
                    <EuiContextMenu initialPanelId={0} panels={panels} />
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {isTimeBased && !hideChart && (
        <EuiFlexItem>
          <section
            ref={(element) => (chartRef.current.element = element)}
            tabIndex={-1}
            aria-label={i18n.translate('discover.histogramOfFoundDocumentsAriaLabel', {
              defaultMessage: 'Histogram of found documents',
            })}
            className="dscTimechart"
          >
            <DiscoverHistogramMemoized
              savedSearchData$={savedSearchDataChart$}
              timefilterUpdateHandler={timefilterUpdateHandler}
              stateContainer={stateContainer}
            />
          </section>
          {appendHistogram}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
