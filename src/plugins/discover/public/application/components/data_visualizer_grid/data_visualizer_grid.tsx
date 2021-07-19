/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiDataGrid, EuiDataGridProps } from '@elastic/eui';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { IndexPattern } from '../../../../../data/common';
import { DiscoverServices } from '../../../build_services';
import { SortPairArr } from '../../angular/doc_table/lib/get_sort';
import { ErrorEmbeddable, IEmbeddable, isErrorEmbeddable } from '../../../../../embeddable/public';

export interface DiscoverDataVisualizerGridProps {
  /**
   * Determines which element labels the grid for ARIA
   */
  ariaLabelledBy: string;
  /**
   * Optional class name to apply
   */
  className?: string;
  /**
   * Determines which columns are displayed
   */
  columns: string[];
  /**
   * If set, the given document is displayed in a flyout
   */
  expandedDoc?: ElasticSearchHit;
  /**
   * The used index pattern
   */
  indexPattern: IndexPattern;
  /**
   * Determines if data is currently loaded
   */
  isLoading: boolean;
  /**
   * Function used to add a column in the document flyout
   */
  onAddColumn: (column: string) => void;
  /**
   * Function to add a filter in the grid cell or document flyout
   */
  onFilter: DocViewFilterFn;
  /**
   * Function used in the grid header and flyout to remove a column
   * @param column
   */
  onRemoveColumn: (column: string) => void;
  /**
   * Function triggered when a column is resized by the user
   */
  onResize?: (colSettings: { columnId: string; width: number }) => void;
  /**
   * Function to set all columns
   */
  onSetColumns: (columns: string[]) => void;
  /**
   * function to change sorting of the documents, skipped when isSortEnabled is set to false
   */
  onSort?: (sort: string[][]) => void;
  /**
   * Array of documents provided by Elasticsearch
   */
  rows?: ElasticSearchHit[];
  /**
   * The max size of the documents returned by Elasticsearch
   */
  sampleSize: number;
  /**
   * Function to set the expanded document, which is displayed in a flyout
   */
  setExpandedDoc: (doc: ElasticSearchHit | undefined) => void;
  /**
   * Grid display settings persisted in Elasticsearch (e.g. column width)
   */
  settings?: any;
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
   * Determines whether the time columns should be displayed (legacy settings)
   */
  showTimeCol: boolean;
  /**
   * Manage user sorting control
   */
  isSortEnabled?: boolean;
  /**
   * Current sort setting
   */
  sort: SortPairArr[];
  /**
   * How the data is fetched
   */
  useNewFieldsApi: boolean;
  /**
   * Manage pagination control
   */
  isPaginationEnabled?: boolean;
  /**
   * List of used control columns (available: 'openDetails', 'select')
   */
  controlColumnIds?: string[];
}

export const EuiDataGridMemoized = React.memo((props: EuiDataGridProps) => {
  return <EuiDataGrid {...props} />;
});

export const DiscoverDataVisualizerGrid = ({
  ariaLabelledBy,
  columns,
  indexPattern,
  isLoading,
  expandedDoc,
  onAddColumn,
  onFilter,
  onRemoveColumn,
  onResize,
  onSetColumns,
  onSort,
  rows,
  sampleSize,
  searchDescription,
  searchTitle,
  services,
  setExpandedDoc,
  settings,
  showTimeCol,
  sort,
  useNewFieldsApi,
  isSortEnabled = true,
  isPaginationEnabled = true,
  controlColumnIds = ['openDetails', 'select'],
  className,
}: DiscoverDataVisualizerGridProps) => {
  const [embeddable, setEmbeddable] = useState<ErrorEmbeddable | IEmbeddable | undefined>();
  const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadEmbeddable = async () => {
      if (services?.embeddable) {
        const factory = services.embeddable.getEmbeddableFactory('data_visualizer_grid');
        if (factory) {
          const test = await factory.create({ id: 'test' });
          setEmbeddable(test);
        }
      }
    };
    loadEmbeddable();
  }, [services?.embeddable]);

  // We can only render after embeddable has already initialized
  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot]);

  return (
    <>
      <div
        data-test-subj="mlEmbeddedMapContent"
        className="mlEmbeddedMapContent"
        ref={embeddableRoot}
      />
      Hello embeddable
    </>
  );
};
