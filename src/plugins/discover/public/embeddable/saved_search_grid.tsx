/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, memo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { DiscoverGrid, DiscoverGridProps } from '../components/discover_grid/discover_grid';
import './saved_search_grid.scss';
import { DiscoverGridFlyout } from '../components/discover_grid/discover_grid_flyout';
import { SavedSearchEmbeddableBase } from './saved_search_embeddable_base';

export interface DiscoverGridEmbeddableProps extends DiscoverGridProps {
  totalHitCount: number;
}

export const DataGridMemoized = memo(DiscoverGrid);

export function DiscoverGridEmbeddable(props: DiscoverGridEmbeddableProps) {
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  return (
    <SavedSearchEmbeddableBase
      totalHitCount={props.totalHitCount}
      isLoading={props.isLoading}
      dataTestSubj="embeddedSavedSearchDocTable"
    >
      <DataGridMemoized
        {...props}
        setExpandedDoc={setExpandedDoc}
        expandedDoc={expandedDoc}
        DocumentView={DiscoverGridFlyout}
      />
    </SavedSearchEmbeddableBase>
  );
}
