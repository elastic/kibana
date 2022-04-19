/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import moment from 'moment';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { HitsCounter } from '../hits_counter';
import { SavedSearch } from '../../../../services/saved_searches';
import { GetStateReturn } from '../../services/discover_state';
import { DiscoverHistogram } from './histogram';
import { DataCharts$, DataTotalHits$ } from '../../utils/use_saved_search';
import { useChartPanels } from './use_chart_panels';
import { VIEW_MODE, DocumentViewModeToggle } from '../../../../components/view_mode_toggle';
import { SHOW_FIELD_STATISTICS } from '../../../../../common';
import { useDiscoverServices } from '../../../../utils/use_discover_services';
import {
  getVisualizeInformation,
  triggerVisualizeActions,
} from '../sidebar/lib/visualize_trigger_utils';

const DiscoverHistogramMemoized = memo(DiscoverHistogram);
export const CHART_HIDDEN_KEY = 'discover:chartHidden';

export function DiscoverChart({
  resetSavedSearch,
  savedSearch,
  savedSearchDataChart$,
  savedSearchDataTotalHits$,
  stateContainer,
  indexPattern,
  viewMode,
  setDiscoverViewMode,
  hideChart,
  interval,
}: {
  resetSavedSearch: () => void;
  savedSearch: SavedSearch;
  savedSearchDataChart$: DataCharts$;
  savedSearchDataTotalHits$: DataTotalHits$;
  stateContainer: GetStateReturn;
  indexPattern: DataView;
  viewMode: VIEW_MODE;
  setDiscoverViewMode: (viewMode: VIEW_MODE) => void;
  hideChart?: boolean;
  interval?: string;
}) {
  const isTimeBased = indexPattern.isTimeBased();
  const { uiSettings, data, storage } = useDiscoverServices();
  const [showChartOptionsPopover, setShowChartOptionsPopover] = useState(false);
  const showViewModeToggle = uiSettings.get(SHOW_FIELD_STATISTICS) ?? false;

  const chartRef = useRef<{ element: HTMLElement | null; moveFocus: boolean }>({
    element: null,
    moveFocus: false,
  });

  const timeField =
    indexPattern.timeFieldName && indexPattern.getFieldByName(indexPattern.timeFieldName);
  const [canVisualize, setCanVisualize] = useState(false);

  useEffect(() => {
    if (!timeField) return;
    getVisualizeInformation(timeField, indexPattern.id, savedSearch.columns || []).then((info) => {
      setCanVisualize(Boolean(info));
    });
  }, [indexPattern, savedSearch.columns, timeField]);

  const onEditVisualization = useCallback(() => {
    if (!timeField) {
      return;
    }
    triggerVisualizeActions(timeField, indexPattern.id, savedSearch.columns || []);
  }, [indexPattern.id, savedSearch, timeField]);

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
  const panels = useChartPanels(
    toggleHideChart,
    (newInterval) => stateContainer.setAppState({ interval: newInterval }),
    () => setShowChartOptionsPopover(false),
    hideChart,
    interval
  );

  return (
    <EuiFlexGroup direction="column" alignItems="stretch" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false} className="dscResultCount">
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
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
          {showViewModeToggle && (
            <EuiFlexItem grow={false}>
              <DocumentViewModeToggle
                viewMode={viewMode}
                setDiscoverViewMode={setDiscoverViewMode}
              />
            </EuiFlexItem>
          )}
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
        <EuiFlexItem grow={false}>
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
            />
          </section>
          <EuiSpacer size="s" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
