/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Filter, Query, AggregateQuery } from '@kbn/es-query';
import { METRIC_TYPE, type UiCounterMetricType } from '@kbn/analytics';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FIELD_STATISTICS_LOADED } from './constants';
import type { DiscoverStateContainer } from '../../services/discover_state';

export interface RandomSamplingOption {
  mode: 'random_sampling';
  seed: string;
  probability: number;
}

export interface NormalSamplingOption {
  mode: 'normal_sampling';
  seed: string;
  shardSize: number;
}

export interface NoSamplingOption {
  mode: 'no_sampling';
  seed: string;
}

export type SamplingOption = RandomSamplingOption | NormalSamplingOption | NoSamplingOption;

export interface FieldStatisticTableEmbeddableApi {
  dataView: DataView;
  savedSearch?: SavedSearch;
  query?: Query | AggregateQuery;
  visibleFieldNames?: string[];
  filters?: Filter[];
  showPreviewByDefault?: boolean;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  sessionId?: string;
  fieldsToFetch?: string[];
  totalDocuments?: number;
  samplingOption?: SamplingOption;
}

export interface FieldStatisticTableEmbeddableState {
  dataView: DataView;
  savedSearch?: SavedSearch;
  query?: Query | AggregateQuery;
  visibleFieldNames?: string[];
  filters?: Filter[];
  showPreviewByDefault?: boolean;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  sessionId?: string;
  fieldsToFetch?: string[];
  totalDocuments?: number;
  samplingOption?: SamplingOption;
}

export interface DataVisualizerGridEmbeddableOutput {
  showDistributions?: boolean;
}

export interface FieldStatisticsTableProps {
  /**
   * Determines which columns are displayed
   */
  columns: string[];
  /**
   * The used data view
   */
  dataView: DataView;
  /**
   * Saved search description
   */
  searchDescription?: string;
  /**
   * Saved search title
   */
  searchTitle?: string;
  /**
   * Optional saved search
   */
  savedSearch?: SavedSearch;
  /**
   * Optional query to update the table content
   */
  query?: Query | AggregateQuery;
  /**
   * Filters query to update the table content
   */
  filters?: Filter[];
  /**
   * State container with persisted settings
   */
  stateContainer?: DiscoverStateContainer;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  /**
   * Metric tracking function
   * @param metricType
   * @param eventName
   */
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  searchSessionId?: string;
}

const statsTableCss = css({
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  '.kbnDocTableWrapper': {
    overflowX: 'hidden',
  },
});

const embeddableEuiPanelCss = css({
  height: 'auto',
  minHeight: 'auto',
});

export const FieldStatisticsTable = (props: FieldStatisticsTableProps) => {
  const {
    dataView,
    savedSearch,
    query,
    columns,
    filters,
    stateContainer,
    onAddFilter,
    trackUiMetric,
    searchSessionId,
  } = props;
  const totalHits = useObservable(stateContainer?.dataState.data$.totalHits$ ?? of(undefined));
  const totalDocuments = useMemo(() => totalHits?.result, [totalHits]);

  const services = useDiscoverServices();

  // State from Discover we want the embeddable to reflect
  const embeddableState$ = useMemo(
    () => new BehaviorSubject<FieldStatisticTableEmbeddableState | undefined>(),
    []
  );
  // Embeddable state exposed to external consumers like Discover
  const embeddableApiSubscription = useRef(null);

  const showPreviewByDefault = useMemo(
    () => (stateContainer ? !stateContainer.appState.getState().hideAggregatedPreview : true),
    [stateContainer]
  );

  useEffect(() => {
    const availableFields$ = stateContainer?.dataState.data$.availableFields$;

    const refetch = stateContainer?.dataState.refetch$.subscribe(() => {
      if (embeddableState$) {
        embeddableState$.next({
          ...embeddableState$.getValue(),
          lastReloadRequestTime: Date.now(),
        });
      }
    });

    const fields = availableFields$?.subscribe(() => {
      if (embeddableState$ && !availableFields$?.getValue().error) {
        embeddableState$.next({
          ...embeddableState$.getValue(),
          fieldsToFetch: availableFields$?.getValue().fields,
        });
      }
    });

    return () => {
      refetch?.unsubscribe();
      fields?.unsubscribe();
      embeddableState$?.unsubscribe();
      embeddableApiSubscription.current?.unsubscribe();
    };
  }, [embeddableState$, stateContainer]);

  const [state, setState] = useState();
  useEffect(() => {
    if (embeddableState$) {
      // Update embeddable whenever one of the important input changes
      embeddableState$.next({
        dataView,
        savedSearch,
        query,
        visibleFieldNames: columns,
        sessionId: searchSessionId,
        fieldsToFetch: stateContainer?.dataState.data$.availableFields$?.getValue().fields,
        totalDocuments,
        showPreviewByDefault,
        samplingOption: {
          mode: 'normal_sampling',
          shardSize: 5000,
          seed: searchSessionId,
        } as NormalSamplingOption,
      });
    }
  }, [
    embeddableState$,
    dataView,
    savedSearch,
    query,
    columns,
    filters,
    searchSessionId,
    totalDocuments,
    stateContainer,
    showPreviewByDefault,
  ]);

  useEffect(() => {
    // Track should only be called once when component is loaded
    trackUiMetric?.(METRIC_TYPE.LOADED, FIELD_STATISTICS_LOADED);
  }, [trackUiMetric]);

  const embeddableApi = useRef<FieldStatisticsTableEmbeddableApi>();
  const parentApi = useMemo(() => {
    return {
      embeddableState$,
      // Overriding with data service from Discover because
      // in serverless, Discover's data might be a proxy
      // in which case the proxied version might be different
      overrideServices: { data: { ...services.data, executionContext: 'discover' } },
      onAddFilter,
    };
  }, [embeddableState$, services.data, onAddFilter]);

  const handleEmbeddableApiReady = useCallback(
    (api: FieldStatisticsTableEmbeddableApi) => {
      embeddableApi.current = api;
      if (api.showDistributions$) {
        embeddableApiSubscription.current = api.showDistributions$.subscribe(
          (showDistributions) => {
            if (showDistributions !== undefined && stateContainer) {
              stateContainer.appState.update({
                hideAggregatedPreview: !showDistributions,
              });
            }
          }
        );
      }
    },
    [stateContainer]
  );

  return (
    <EuiFlexItem css={statsTableCss}>
      <ReactEmbeddableRenderer<
        FieldStatisticsTableEmbeddableState,
        FieldStatisticsTableEmbeddableApi
      >
        maybeId={'discover_data_visualizer_grid'}
        type={'data_visualizer_grid'}
        state={{
          // initialState of embeddalbe
          rawState: embeddableState$.getValue() ?? {},
        }}
        parentApi={parentApi}
        onApiAvailable={handleEmbeddableApiReady}
        panelProps={{
          css: embeddableEuiPanelCss,
          hideHeader: true,
          hideInspector: true,
          showShadow: false,
          showBorder: false,
        }}
      />
    </EuiFlexItem>
  );
};
