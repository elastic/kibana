/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { memo, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { SearchResponseInterceptedWarning } from '@kbn/search-response-warnings';
import {
  DiscoverGrid,
  DiscoverGridProps,
  DataLoadingState as DiscoverDataLoadingState,
} from '../components/discover_grid/discover_grid';
import './saved_search_grid.scss';
import { DiscoverGridFlyout } from '../components/discover_grid/discover_grid_flyout';
import { SavedSearchEmbeddableBase } from './saved_search_embeddable_base';
export { DataLoadingState } from '../components/discover_grid/discover_grid';

export interface DiscoverGridEmbeddableProps extends DiscoverGridProps {
  totalHitCount?: number;
  interceptedWarnings?: SearchResponseInterceptedWarning[];
}

export const DiscoverGridMemoized = memo(DiscoverGrid);

export function DiscoverGridEmbeddable(props: DiscoverGridEmbeddableProps) {
  const { interceptedWarnings, ...gridProps } = props;
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  return (
    <SavedSearchEmbeddableBase
      totalHitCount={props.totalHitCount}
      isLoading={props.loadingState === DiscoverDataLoadingState.loading}
      dataTestSubj="embeddedSavedSearchDocTable"
      interceptedWarnings={props.interceptedWarnings}
    >
      <DiscoverGridMemoized
        {...gridProps}
        totalHits={props.totalHitCount}
        setExpandedDoc={setExpandedDoc}
        expandedDoc={expandedDoc}
        DocumentView={DiscoverGridFlyout}
      />
    </SavedSearchEmbeddableBase>
  );
}
