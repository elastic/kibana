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
import type { DataView } from '@kbn/data-views-plugin/public';
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
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
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

interface EmbeddableLogCategorizationProps<T = Query | AggregateQuery> {
  dataView: DataView;
  savedSearch?: SavedSearch | null;
  query?: T;
  filters?: Filter[];
  id?: string;
  embeddingOrigin?: string;
  onAddFilter?: () => void;
  getViewModeToggle: (patternCount: number) => React.ReactElement | undefined;
  setPatternCount: (patternCount: number | undefined) => void;
  /**
   * Callback to add a filter to filter bar
   */
  // onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}

export type EmbeddableLogCategorizationInput = EmbeddableInput & EmbeddableLogCategorizationProps;

export type EmbeddableLogCategorizationOutput = EmbeddableOutput & { indexPatterns?: DataView[] };

// export interface DataVisualizerGridEmbeddableInput extends EmbeddableInput {
//   // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!rename
//   dataView: DataView;
//   savedSearch?: SavedSearch;
//   query?: Query | AggregateQuery;
//   visibleFieldNames?: string[];
//   filters?: Filter[];
//   showPreviewByDefault?: boolean;
//   /**
//    * Callback to add a filter to filter bar
//    */
//   onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
//   sessionId?: string;
//   fieldsToFetch?: string[];
//   totalDocuments?: number;
//   samplingOption?: SamplingOption;
//   getViewModeToggle: (patternCount: number) => React.ReactElement | undefined;
// }
// export interface DataVisualizerGridEmbeddableOutput extends EmbeddableOutput {
//   showDistributions?: boolean;
// }

export interface LogCategorizationTableProps {
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
  // onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  onAddFilter?: () => void;
  /**
   * Metric tracking function
   * @param metricType
   * @param eventName
   */
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  searchSessionId?: string;
  getViewModeToggle?: (patternCount: number) => React.ReactElement | undefined;
  setPatternCount: (patternCount: number | undefined) => void;
}

export const LogCategorizationTable = (props: LogCategorizationTableProps) => {
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
    getViewModeToggle,
  } = props;

  const totalHits = useObservable(stateContainer?.dataState.data$.totalHits$ ?? of(undefined));
  const totalDocuments = useMemo(() => totalHits?.result, [totalHits]);

  const services = useDiscoverServices();
  const [embeddable, setEmbeddable] = useState<
    | ErrorEmbeddable
    | IEmbeddable<EmbeddableLogCategorizationInput, EmbeddableLogCategorizationOutput>
    | undefined
  >();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  const showPreviewByDefault = useMemo(
    () => (stateContainer ? !stateContainer.appState.getState().hideAggregatedPreview : true),
    [stateContainer]
  );

  useEffect(() => {
    // const availableFields$ = stateContainer?.dataState.data$.availableFields$;
    // const sub = embeddable?.getOutput$().subscribe((output: DataVisualizerGridEmbeddableOutput) => {
    //   if (output.showDistributions !== undefined && stateContainer) {
    //     stateContainer.appState.update({ hideAggregatedPreview: !output.showDistributions });
    //   }
    // });

    const refetch = stateContainer?.dataState.refetch$.subscribe(() => {
      if (embeddable && !isErrorEmbeddable(embeddable)) {
        embeddable.updateInput({ lastReloadRequestTime: Date.now() });
      }
    });

    // const fields = availableFields$?.subscribe(() => {
    //   if (embeddable && !isErrorEmbeddable(embeddable) && !availableFields$?.getValue().error) {
    //     embeddable.updateInput({ fieldsToFetch: availableFields$?.getValue().fields });
    //   }
    // });

    return () => {
      // sub?.unsubscribe();
      refetch?.unsubscribe();
      // fields?.unsubscribe();
    };
  }, [embeddable, stateContainer]);

  useEffect(() => {
    if (embeddable && !isErrorEmbeddable(embeddable)) {
      // Update embeddable whenever one of the important input changes
      embeddable.updateInput({
        dataView,
        savedSearch,
        query,
        filters,
        // visibleFieldNames: columns,
        // onAddFilter,
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
    totalDocuments,
    stateContainer,
  ]);

  useEffect(() => {
    if (showPreviewByDefault && embeddable && !isErrorEmbeddable(embeddable)) {
      // Update embeddable whenever one of the important input changes
      // embeddable.updateInput({
      //   showPreviewByDefault,
      // });

      embeddable.reload();
    }
  }, [showPreviewByDefault, embeddable]);

  useEffect(() => {
    let unmounted = false;
    const loadEmbeddable = async () => {
      if (services.embeddable) {
        const factory = services.embeddable.getEmbeddableFactory<
          EmbeddableLogCategorizationInput,
          EmbeddableLogCategorizationOutput
        >('aiopsLogCategorization');
        if (factory) {
          // Initialize embeddable with information available at mount
          const initializedEmbeddable = await factory.create({
            id: 'aiopsLogCategorization',
            dataView,
            savedSearch,
            query,
            onAddFilter,
            getViewModeToggle: getViewModeToggle ?? ((p: number) => <></>),
            setPatternCount: props.setPatternCount,
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
