/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useRef, useCallback } from 'react';
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
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { Subscription } from 'rxjs';
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

export interface FieldStatisticsTableEmbeddableState {
  /**
   * Data view is required for esql:false or non-ESQL mode
   */
  dataView?: DataView;
  /**
   * Kibana saved search object
   */
  savedSearch?: SavedSearch;
  /**
   * Kibana query
   */
  query?: Query | AggregateQuery;
  /**
   * List of fields to visibile show in the table
   * set shouldGetSubfields: true if table needs to show the sub multi-field like .keyword
   */
  visibleFieldNames?: string[];
  /**
   * List of filters
   */
  filters?: Filter[];
  /**
   * Whether to show the preview/mini distribution chart on the tables upon first table mounting
   */
  showPreviewByDefault?: boolean;
  /**
   * If true, will show a button action to edit the data view field in every row
   */
  allowEditDataView?: boolean;
  /**
   * Optional id to identify the embeddable
   */
  id?: string;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  /**
   * Optional search sessionId to save and restore long running search
   * If not provided, will generate its own sessionId
   */
  sessionId?: string;
  /**
   * Optional list of fields provided to table to fetch a subset of fields only
   * so it doesn't need to fetch all fields
   */
  fieldsToFetch?: string[];
  /**
   * Total documents optionally provided to help table have context of the fetch size
   * so it can reduce redundant API requests
   */
  totalDocuments?: number;
  /**
   * For non-ESQL mode, the sampling option is used to determine the sampling strategy
   */
  samplingOption?: SamplingOption;
  /**
   * If esql:true, switch table to ES|QL mode
   */
  esql?: boolean;
  /**
   * If esql:true, the index pattern is used to validate time field
   */
  indexPattern?: string;
  /**
   * If true, the table will try to retrieve subfield information as well based on visibleFields
   * For example: visibleFields: ['field1', 'field2'] => will show ['field1', 'field1.keyword', 'field2', 'field2.keyword']
   */
  shouldGetSubfields?: boolean;
  /**
   * Force refresh the table
   */
  lastReloadRequestTime?: number;
}

export interface FieldStatisticsTableEmbeddableApi {
  showDistributions$?: BehaviorSubject<boolean>;
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
    () => new BehaviorSubject<FieldStatisticsTableEmbeddableState | undefined>(undefined),
    []
  );
  // Embeddable state exposed to external consumers like Discover
  const embeddableApiSubscription = useRef<Subscription | undefined>(undefined);

  const showPreviewByDefault = useMemo(
    () => (stateContainer ? !stateContainer.appState.getState().hideAggregatedPreview : true),
    [stateContainer]
  );

  useEffect(
    function syncChangesToEmbeddableState() {
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
    },
    [embeddableState$, stateContainer]
  );

  const initialState = useMemo(() => {
    return {
      shouldGetSubfields: true,
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
    };
    // We just need a snapshot of initialState upon table mounting
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (embeddableState$) {
      // Update embeddable whenever one of the important input changes
      embeddableState$.next({
        shouldGetSubfields: true,
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
      overrideServices: { data: { ...services.data, applicationContext: 'discover' } },
      onAddFilter,
    };
  }, [embeddableState$, services.data, onAddFilter]);

  const handleEmbeddableApiReady = useCallback(
    (api: FieldStatisticsTableEmbeddableApi) => {
      embeddableApi.current = api;
      if (api.showDistributions$) {
        embeddableApiSubscription.current = api.showDistributions$.subscribe(
          (showDistributions?: boolean) => {
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
        DefaultEmbeddableApi<FieldStatisticsTableEmbeddableState>,
        FieldStatisticsTableEmbeddableApi
      >
        maybeId={'discover_data_visualizer_grid'}
        type={'data_visualizer_grid'}
        state={{
          // initialState of the embeddable to be serialized
          rawState: initialState,
        }}
        parentApi={parentApi}
        onApiAvailable={handleEmbeddableApiReady}
        panelProps={{
          css: css({
            height: 'auto',
            minHeight: 'auto',
          }),
          hideHeader: true,
          hideInspector: true,
          showShadow: false,
          showBorder: false,
        }}
      />
    </EuiFlexItem>
  );
};
