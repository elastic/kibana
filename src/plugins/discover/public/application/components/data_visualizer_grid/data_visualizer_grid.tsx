/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EuiDataGrid, EuiDataGridProps } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { DataView, Query } from '../../../../../data/common';
import { DiscoverServices } from '../../../build_services';
import {
  EmbeddableInput,
  EmbeddableOutput,
  ErrorEmbeddable,
  IEmbeddable,
  isErrorEmbeddable,
} from '../../../../../embeddable/public';
import { SavedSearch } from '../../../saved_searches';
import { GetStateReturn } from '../../apps/main/services/discover_state';

export interface DataVisualizerGridEmbeddableInput extends EmbeddableInput {
  indexPattern: DataView;
  savedSearch?: SavedSearch;
  query?: Query;
  visibleFieldNames?: string[];
  filters?: Filter[];
  showPreviewByDefault?: boolean;
}
export interface DataVisualizerGridEmbeddableOutput extends EmbeddableOutput {
  showDistributions?: boolean;
}

export interface DiscoverDataVisualizerGridProps {
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
  savedSearch?: SavedSearch;
  query?: Query;
  filters?: Filter[];
  stateContainer: GetStateReturn;
}

export const EuiDataGridMemoized = React.memo((props: EuiDataGridProps) => {
  return <EuiDataGrid {...props} />;
});

export const DiscoverDataVisualizerGrid = (props: DiscoverDataVisualizerGridProps) => {
  const { services, indexPattern, savedSearch, query, columns, filters, stateContainer } = props;
  const { uiSettings } = services;

  const [embeddable, setEmbeddable] = useState<
    | ErrorEmbeddable
    | IEmbeddable<DataVisualizerGridEmbeddableInput, DataVisualizerGridEmbeddableOutput>
    | undefined
  >();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  const showPreviewByDefault = useMemo(
    () => !stateContainer.appStateContainer.getState().hideAggregatedPreview,
    [stateContainer.appStateContainer]
  );

  useEffect(() => {
    embeddable?.getOutput$().subscribe((output: DataVisualizerGridEmbeddableOutput) => {
      if (output.showDistributions !== undefined) {
        stateContainer.setAppState({ hideAggregatedPreview: !output.showDistributions });
      }
    });
  }, [embeddable, stateContainer]);

  useEffect(() => {
    if (embeddable && !isErrorEmbeddable(embeddable)) {
      // Update embeddable whenever one of the important input changes
      embeddable.updateInput({
        indexPattern,
        savedSearch,
        query,
        filters,
        visibleFieldNames: columns,
      });
      embeddable.reload();
    }
  }, [embeddable, indexPattern, savedSearch, query, columns, filters]);

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
    return () => {
      // Clean up embeddable upon unmounting
      embeddable?.destroy();
    };
  }, [embeddable]);

  useEffect(() => {
    let unmounted = false;
    const loadEmbeddable = async () => {
      if (services?.embeddable) {
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
  }, [services?.embeddable, showPreviewByDefault]);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot, uiSettings]);

  return (
    <div
      data-test-subj="dataVisualizerEmbeddedContent"
      ref={embeddableRoot}
      style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
      className="kbnDocTableWrapper"
    />
  );
};
