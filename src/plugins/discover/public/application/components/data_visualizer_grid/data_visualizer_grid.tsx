/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiDataGrid, EuiDataGridProps } from '@elastic/eui';
import { IndexPattern, Query } from '../../../../../data/common';
import { DiscoverServices } from '../../../build_services';
import { ErrorEmbeddable, IEmbeddable, isErrorEmbeddable } from '../../../../../embeddable/public';
import { SavedSearch } from '../../../saved_searches';
import type {
  DataVisualizerGridEmbeddableInput,
  DataVisualizerGridEmbeddableOutput,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../../x-pack/plugins/data_visualizer/public/application/index_data_visualizer/embeddables/grid_embeddable/grid_embeddable';

export interface DiscoverDataVisualizerGridProps {
  /**
   * Determines which columns are displayed
   */
  columns: string[];
  /**
   * The used index pattern
   */
  indexPattern: IndexPattern;
  /**
   * The max size of the documents returned by Elasticsearch
   */
  sampleSize: number;
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
}

export const EuiDataGridMemoized = React.memo((props: EuiDataGridProps) => {
  return <EuiDataGrid {...props} />;
});

export const DiscoverDataVisualizerGrid = (props: DiscoverDataVisualizerGridProps) => {
  const { services, indexPattern, savedSearch, query, columns } = props;
  const [embeddable, setEmbeddable] = useState<
    | ErrorEmbeddable
    | IEmbeddable<DataVisualizerGridEmbeddableInput, DataVisualizerGridEmbeddableOutput>
    | undefined
  >();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embeddable && !isErrorEmbeddable(embeddable)) {
      // Update embeddable whenever one of the important input changes
      embeddable.updateInput({
        indexPattern,
        savedSearch,
        query,
        visibleFieldNames: columns,
      });
      embeddable.reload();
    }
  }, [embeddable, indexPattern, savedSearch, query, columns]);

  useEffect(() => {
    return () => {
      // Clean up embeddable upon unmounting
      if (embeddable) {
        embeddable.destroy();
      }
    };
  }, [embeddable]);

  useEffect(() => {
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
          });
          setEmbeddable(initializedEmbeddable);
        }
      }
    };
    loadEmbeddable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services?.embeddable]);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot]);

  return <div data-test-subj="dataVisualizerEmbeddedContent" ref={embeddableRoot} />;
};
