/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { Filter, Query, AggregateQuery } from '@kbn/es-query';
import { UiCounterMetricType } from '@kbn/analytics';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import { EuiFlexItem } from '@elastic/eui';
import {
  EmbeddableInput,
  EmbeddableOutput,
  ErrorEmbeddable,
  IEmbeddable,
  // isErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import type { DiscoverStateContainer } from '../../services/discover_state';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
export interface ExplainLogRateSpikesInput {
  dataView: DataView;
  savedSearch?: SavedSearch | null;
  query?: Query;
  visibleFieldNames?: string[];
  filters?: Filter[];
  showPreviewByDefault?: boolean;
  allowEditDataView?: boolean;
  id?: string;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  sessionId?: string;
  fieldsToFetch?: string[];
  totalDocuments?: number;
  // samplingOption?: SamplingOption;
}
export type ExplainLogRateSpikesEmbeddableInput = EmbeddableInput & ExplainLogRateSpikesInput;
export type ExplainLogRateSpikesEmbeddableOutput = EmbeddableOutput;

export interface ExplainLogRateSpikesViewProps {
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

export const ExplainLogRateSpikesView = (props: ExplainLogRateSpikesViewProps) => {
  const {
    dataView,
    savedSearch,
    query,
    filters,
    // stateContainer,
    onAddFilter,
    trackUiMetric,
    // searchSessionId,
  } = props;

  const services = useDiscoverServices();
  const [embeddable, setEmbeddable] = useState<
    | ErrorEmbeddable
    | IEmbeddable<ExplainLogRateSpikesEmbeddableInput, ExplainLogRateSpikesEmbeddableOutput>
    | undefined
  >();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unmounted = false;
    const loadEmbeddable = async () => {
      if (services.embeddable) {
        const factory = services.embeddable.getEmbeddableFactory<EmbeddableInput, EmbeddableOutput>(
          'explain_log_rate_spikes_view'
        );
        if (factory) {
          // Initialize embeddable with information available at mount
          const initializedEmbeddable = await factory.create({
            id: 'discover_explain_log_rate_spikes_view',
            dataView,
            filters,
            savedSearch,
            query,
            showPreviewByDefault: false,
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
  }, [services.embeddable]);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);

      // trackUiMetric?.(METRIC_TYPE.LOADED, FIELD_STATISTICS_LOADED);
    }

    return () => {
      // Clean up embeddable upon unmounting
      embeddable?.destroy();
    };
  }, [embeddable, embeddableRoot, trackUiMetric]);

  useEffect(
    function syncIntoEmbeddable() {
      if (embeddable) {
        embeddable.updateInput({
          dataView,
          savedSearch,
          query,
          filters,
        });
      }
    },
    [embeddable, filters, query, dataView, savedSearch]
  );

  const elrsViewCss = css`
    overflow-y: auto;

    .kbnDocTableWrapper {
      overflow-x: hidden;
    }
  `;

  return (
    <EuiFlexItem css={elrsViewCss}>
      <div
        data-test-subj="dscExplainLogRateSpikesEmbeddedContent"
        ref={embeddableRoot}
        // Match the scroll bar of the Discover doc table
        className="kbnDocTableWrapper"
      />
    </EuiFlexItem>
  );
};
