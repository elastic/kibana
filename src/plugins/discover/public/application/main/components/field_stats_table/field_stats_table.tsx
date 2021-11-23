/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { IndexPatternField, IndexPattern, DataView, Query } from '../../../../../../data/common';
import type { DiscoverServices } from '../../../../build_services';
import {
  EmbeddableInput,
  EmbeddableOutput,
  ErrorEmbeddable,
  IEmbeddable,
  isErrorEmbeddable,
} from '../../../../../../embeddable/public';
import { FIELD_STATISTICS_LOADED } from './constants';
import type { SavedSearch } from '../../../../services/saved_searches';
import type { GetStateReturn } from '../../services/discover_state';
import { DataRefetch$ } from '../../utils/use_saved_search';

export interface DataVisualizerGridEmbeddableInput extends EmbeddableInput {
  indexPattern: IndexPattern;
  savedSearch?: SavedSearch;
  query?: Query;
  visibleFieldNames?: string[];
  filters?: Filter[];
  showPreviewByDefault?: boolean;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
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
   * The used index pattern
   */
  indexPattern: DataView;
  /**
   * Saved search description
   */
  searchDescription?: string;
  /**
   * Saved search title
   */
  searchTitle?: string;
  /**
   * Discover plugin services
   */
  services: DiscoverServices;
  /**
   * Optional saved search
   */
  savedSearch?: SavedSearch;
  /**
   * Optional query to update the table content
   */
  query?: Query;
  /**
   * Filters query to update the table content
   */
  filters?: Filter[];
  /**
   * State container with persisted settings
   */
  stateContainer?: GetStateReturn;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  /**
   * Metric tracking function
   * @param metricType
   * @param eventName
   */
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  savedSearchRefetch$?: DataRefetch$;
}

export const FieldStatisticsTable = (props: FieldStatisticsTableProps) => {
  const {
    services,
    indexPattern,
    savedSearch,
    query,
    columns,
    filters,
    stateContainer,
    onAddFilter,
    trackUiMetric,
    savedSearchRefetch$,
  } = props;
  const { uiSettings } = services;
  const [embeddable, setEmbeddable] = useState<
    | ErrorEmbeddable
    | IEmbeddable<DataVisualizerGridEmbeddableInput, DataVisualizerGridEmbeddableOutput>
    | undefined
  >();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  const showPreviewByDefault = useMemo(
    () =>
      stateContainer ? !stateContainer.appStateContainer.getState().hideAggregatedPreview : true,
    [stateContainer]
  );

  useEffect(() => {
    const sub = embeddable?.getOutput$().subscribe((output: DataVisualizerGridEmbeddableOutput) => {
      if (output.showDistributions !== undefined && stateContainer) {
        stateContainer.setAppState({ hideAggregatedPreview: !output.showDistributions });
      }
    });

    const refetch = savedSearchRefetch$?.subscribe(() => {
      if (embeddable && !isErrorEmbeddable(embeddable)) {
        embeddable.updateInput({ lastReloadRequestTime: Date.now() });
      }
    });
    return () => {
      sub?.unsubscribe();
      refetch?.unsubscribe();
    };
  }, [embeddable, stateContainer, savedSearchRefetch$]);

  useEffect(() => {
    if (embeddable && !isErrorEmbeddable(embeddable)) {
      // Update embeddable whenever one of the important input changes
      embeddable.updateInput({
        indexPattern,
        savedSearch,
        query,
        filters,
        visibleFieldNames: columns,
        onAddFilter,
      });
      embeddable.reload();
    }
  }, [embeddable, indexPattern, savedSearch, query, columns, filters, onAddFilter]);

  useEffect(() => {
    if (showPreviewByDefault && embeddable && !isErrorEmbeddable(embeddable)) {
      // Update embeddable whenever one of the important input changes
      embeddable.updateInput({
        showPreviewByDefault,
      });

      embeddable.reload();
    }
  }, [showPreviewByDefault, uiSettings, embeddable]);

  useEffect(() => {
    let unmounted = false;
    const loadEmbeddable = async () => {
      if (services.embeddable) {
        const factory = services.embeddable.getEmbeddableFactory<
          DataVisualizerGridEmbeddableInput,
          DataVisualizerGridEmbeddableOutput
        >('data_visualizer_grid');
        if (factory) {
          // Initialize embeddable with information available at mount
          const initializedEmbeddable = await factory.create({
            id: 'discover_data_visualizer_grid',
            indexPattern,
            savedSearch,
            query,
            showPreviewByDefault,
            onAddFilter,
          });
          if (!unmounted) {
            setEmbeddable(initializedEmbeddable);
          }
        }
      }
    };
    loadEmbeddable();
    return () => {
      unmounted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services.embeddable, showPreviewByDefault]);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);

      trackUiMetric?.(METRIC_TYPE.LOADED, FIELD_STATISTICS_LOADED);
    }

    return () => {
      // Clean up embeddable upon unmounting
      embeddable?.destroy();
    };
  }, [embeddable, embeddableRoot, uiSettings, trackUiMetric]);

  return (
    <div
      data-test-subj="dscFieldStatsEmbeddedContent"
      ref={embeddableRoot}
      style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
      // Match the scroll bar of the Discover doc table
      className="kbnDocTableWrapper"
    />
  );
};
