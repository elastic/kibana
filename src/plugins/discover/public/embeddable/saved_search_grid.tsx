/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DataTableRecord } from '../types';
import { DiscoverGrid, DiscoverGridProps } from '../components/discover_grid/discover_grid';
import { TotalDocuments } from '../application/main/components/total_documents/total_documents';
import './saved_search_grid.scss';
import { DiscoverGridFlyout } from '../components/discover_grid/discover_grid_flyout';

export interface DiscoverGridEmbeddableProps extends DiscoverGridProps {
  totalHitCount: number;
}

export const DataGridMemoized = memo(DiscoverGrid);

export function DiscoverGridEmbeddable(props: DiscoverGridEmbeddableProps) {
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);

  return (
    <EuiFlexGroup
      style={{ width: '100%' }}
      direction="column"
      gutterSize="xs"
      responsive={false}
      data-test-subj="embeddedSavedSearchDocTable"
    >
      {props.totalHitCount !== 0 && (
        <EuiFlexItem grow={false} style={{ alignSelf: 'flex-end' }}>
          <TotalDocuments totalHitCount={props.totalHitCount} />
        </EuiFlexItem>
      )}
      <EuiFlexItem style={{ minHeight: 0 }}>
        <DataGridMemoized
          {...props}
          setExpandedDoc={!props.isPlainRecord ? setExpandedDoc : undefined}
          expandedDoc={expandedDoc}
          DocumentView={DiscoverGridFlyout}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
