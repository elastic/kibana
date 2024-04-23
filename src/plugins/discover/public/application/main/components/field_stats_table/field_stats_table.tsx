/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Filter, Query, AggregateQuery } from '@kbn/es-query';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import {
  EmbeddableInput,
  EmbeddableOutput,
  ReactEmbeddableRenderer,
} from '@kbn/embeddable-plugin/public';
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

export interface DataVisualizerGridEmbeddableInput extends EmbeddableInput {
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

export interface DataVisualizerGridEmbeddableOutput extends EmbeddableOutput {
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

  const embeddableState$ = useMemo(
    () => new BehaviorSubject<FieldStatisticTableEmbeddableState | undefined>(),
    []
  );

  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  const showPreviewByDefault = useMemo(
    () => (stateContainer ? !stateContainer.appState.getState().hideAggregatedPreview : true),
    [stateContainer]
  );

  useEffect(() => {
    const availableFields$ = stateContainer?.dataState.data$.availableFields$;
    // @todo
    // const sub = embeddable?.getOutput$().subscribe((output: DataVisualizerGridEmbeddableOutput) => {
    //   if (output.showDistributions !== undefined && stateContainer) {
    //     stateContainer.appState.update({ hideAggregatedPreview: !output.showDistributions });
    //   }
    // });

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
      // sub?.unsubscribe();
      refetch?.unsubscribe();
      fields?.unsubscribe();
      embeddableState$?.unsubscribe();
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
        filters,
        visibleFieldNames: columns,
        // onAddFilter,
        sessionId: searchSessionId,
        fieldsToFetch: stateContainer?.dataState.data$.availableFields$?.getValue().fields,
        totalDocuments,
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
    onAddFilter,
    searchSessionId,
    totalDocuments,
    stateContainer,
  ]);

  useEffect(() => {
    if (showPreviewByDefault && embeddableState$) {
      // Update embeddable whenever one of the important input changes
      embeddableState$.next({
        ...embeddableState$.getValue(),
        showPreviewByDefault,
      });
    }
  }, [showPreviewByDefault, embeddableState$]);

  // useEffect(() => {
  //   let unmounted = false;
  //   const loadEmbeddable = async () => {
  //     if (services.embeddable) {
  //       const factory = .getEmservices.embeddablebeddableFactory<
  //         DataVisualizerGridEmbeddableInput,
  //         DataVisualizerGridEmbeddableOutput
  //       >('data_visualizer_grid');
  //       if (factory) {
  //         // Initialize embeddable with information available at mount
  //         const initializedEmbeddable = await factory.create({
  //           id: 'discover_data_visualizer_grid',
  //           dataView,
  //           savedSearch,
  //           query,
  //           showPreviewByDefault,
  //           onAddFilter,
  //         });
  //         if (!unmounted) {
  //           setEmbeddable(initializedEmbeddable);
  //         }
  //       }
  //     }
  //   };
  //   loadEmbeddable();
  //   return () => {
  //     unmounted = true;
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [services.embeddable, showPreviewByDefault]);

  useEffect(() => {
    trackUiMetric?.(METRIC_TYPE.LOADED, FIELD_STATISTICS_LOADED);

    return () => {};
  }, [trackUiMetric]);

  const embeddableApi = useRef<AnomalySwimLaneEmbeddableApi>();
  const parentApi = useMemo(() => {
    // @TODO: remove
    console.log(`--@@parentApi updated`);
    return {
      embeddableState$,
      overrideServices: { data: { ...services.data, id: 'overriden' } },
      onAddFilter,
    };
  }, [embeddableState$, services.data, onAddFilter]);

  return (
    <EuiFlexItem css={statsTableCss}>
      <ReactEmbeddableRenderer<AnomalySwimLaneEmbeddableState, AnomalySwimLaneEmbeddableApi>
        maybeId={'discover_data_visualizer_grid'}
        type={'data_visualizer_grid'}
        state={{
          rawState: embeddableState$.getValue() ?? {},
        }}
        parentApi={parentApi}
        onApiAvailable={(api) => {
          embeddableApi.current = api;
        }}
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
