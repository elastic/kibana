/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import {
  ErrorEmbeddable,
  type IEmbeddable,
  isErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import {
  type EmbeddableLogCategorizationInput,
  type EmbeddableLogCategorizationOutput,
  type EmbeddableLogCategorizationProps,
  EMBEDDABLE_LOG_CATEGORIZATION_TYPE,
} from '@kbn/aiops-log-pattern-analysis/embeddable';
import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { PATTERN_ANALYSIS_LOADED } from './constants';
import type { DiscoverStateContainer } from '../../services/discover_state';

export type LogCategorizationTableProps = EmbeddableLogCategorizationProps & {
  searchDescription?: string;

  /**
   * State container with persisted settings
   */
  stateContainer?: DiscoverStateContainer;
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  searchSessionId?: string;
  viewModeToggle: React.ReactElement;
  setOptionsMenu: (optionsMenu: React.ReactElement | undefined) => void;
};

export const LogCategorizationTable = (props: LogCategorizationTableProps) => {
  const {
    dataView,
    savedSearch,
    query,
    filters,
    stateContainer,
    onAddFilter,
    trackUiMetric,
    searchSessionId,
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

  useEffect(() => {
    const refetch = stateContainer?.dataState.refetch$.subscribe(() => {
      if (embeddable && !isErrorEmbeddable(embeddable)) {
        embeddable.updateInput({ lastReloadRequestTime: Date.now() });
      }
    });

    return () => {
      refetch?.unsubscribe();
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
      });
      embeddable.reload();
    }
  }, [
    embeddable,
    dataView,
    savedSearch,
    query,
    filters,
    searchSessionId,
    totalDocuments,
    stateContainer,
  ]);

  useEffect(() => {
    let unmounted = false;
    const loadEmbeddable = async () => {
      if (services.embeddable) {
        const factory = services.embeddable.getEmbeddableFactory<
          EmbeddableLogCategorizationInput,
          EmbeddableLogCategorizationOutput
        >(EMBEDDABLE_LOG_CATEGORIZATION_TYPE);
        if (factory) {
          // Initialize embeddable with information available at mount
          const initializedEmbeddable = await factory.create({
            id: EMBEDDABLE_LOG_CATEGORIZATION_TYPE,
            dataView,
            savedSearch,
            query,
            onAddFilter,
            setPatternCount: props.setPatternCount,
            setOptionsMenu: props.setOptionsMenu,
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

      trackUiMetric?.(METRIC_TYPE.LOADED, PATTERN_ANALYSIS_LOADED);
    }

    return () => {
      // Clean up embeddable upon unmounting
      embeddable?.destroy();
    };
  }, [embeddable, embeddableRoot, trackUiMetric]);

  const style = css`
    overflow-y: auto;

    .kbnDocTableWrapper {
      overflow-x: hidden;
    }
  `;

  return (
    <EuiFlexItem css={style}>
      <div
        data-test-subj="dscFieldStatsEmbeddedContent"
        ref={embeddableRoot}
        // Match the scroll bar of the Discover doc table
        className="kbnDocTableWrapper"
      />
    </EuiFlexItem>
  );
};
