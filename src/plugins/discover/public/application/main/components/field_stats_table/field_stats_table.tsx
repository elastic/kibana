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
  ErrorEmbeddable,
  IEmbeddable,
  isErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FIELD_STATISTICS_LOADED } from './constants';
import type { GetStateReturn } from '../../services/discover_state';
import { AvailableFields$, DataRefetch$, DataTotalHits$ } from '../../hooks/use_saved_search';

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
  stateContainer?: GetStateReturn;
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
  savedSearchRefetch$?: DataRefetch$;
  availableFields$?: AvailableFields$;
  searchSessionId?: string;
  savedSearchDataTotalHits$?: DataTotalHits$;
}

export const FieldStatisticsTable = (props: FieldStatisticsTableProps) => {
  const {
    availableFields$,
    dataView,
    savedSearch,
    query,
    columns,
    filters,
    stateContainer,
    onAddFilter,
    trackUiMetric,
    savedSearchRefetch$,
    searchSessionId,
    savedSearchDataTotalHits$,
  } = props;
  const services = useDiscoverServices();
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

    const fields = availableFields$?.subscribe(() => {
      if (embeddable && !isErrorEmbeddable(embeddable) && !availableFields$?.getValue().error) {
        embeddable.updateInput({ fieldsToFetch: availableFields$?.getValue().fields });
      }
    });

    return () => {
      sub?.unsubscribe();
      refetch?.unsubscribe();
      fields?.unsubscribe();
    };
  }, [embeddable, stateContainer, savedSearchRefetch$, availableFields$]);

  useEffect(() => {
    if (embeddable && !isErrorEmbeddable(embeddable)) {
      // Update embeddable whenever one of the important input changes
      embeddable.updateInput({
        dataView,
        savedSearch,
        query,
        filters,
        visibleFieldNames: columns,
        onAddFilter,
        sessionId: searchSessionId,
        fieldsToFetch: availableFields$?.getValue().fields,
        totalDocuments: savedSearchDataTotalHits$
          ? savedSearchDataTotalHits$.getValue()?.result
          : undefined,
      });
      embeddable.reload();
    }
  }, [
    embeddable,
    dataView,
    savedSearch,
    query,
    columns,
    filters,
    onAddFilter,
    searchSessionId,
    availableFields$,
    savedSearchDataTotalHits$,
  ]);

  useEffect(() => {
    if (showPreviewByDefault && embeddable && !isErrorEmbeddable(embeddable)) {
      // Update embeddable whenever one of the important input changes
      embeddable.updateInput({
        showPreviewByDefault,
      });

      embeddable.reload();
    }
  }, [showPreviewByDefault, embeddable]);

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
            dataView,
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
  }, [embeddable, embeddableRoot, trackUiMetric]);

  const statsTableCss = css`
    overflow-y: auto;

    .kbnDocTableWrapper {
      overflow-x: hidden;
    }
  `;

  return (
    <EuiFlexItem css={statsTableCss}>
      <div
        data-test-subj="dscFieldStatsEmbeddedContent"
        ref={embeddableRoot}
        // Match the scroll bar of the Discover doc table
        className="kbnDocTableWrapper"
      />
    </EuiFlexItem>
  );
};
