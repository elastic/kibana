/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { DiscoverGrid, DiscoverGridProps } from '../components/discover_grid/discover_grid';
import { getServices } from '../../kibana_services';
import { ElasticSearchHit } from '../doc_views/doc_views_types';

export const DataGridMemoized = React.memo((props: DiscoverGridProps) => (
  <DiscoverGrid {...props} />
));

export function DiscoverGridEmbeddable(props: DiscoverGridProps) {
  const [expandedDoc, setExpandedDoc] = useState<ElasticSearchHit | undefined>(undefined);

  return (
    <I18nProvider>
      <DataGridMemoized
        {...props}
        setExpandedDoc={setExpandedDoc}
        expandedDoc={expandedDoc}
        services={getServices()}
      />
    </I18nProvider>
  );
}

/**
 * this is just needed for the embeddable
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDiscoverGridDirective(reactDirective: any) {
  return reactDirective(DiscoverGridEmbeddable, [
    ['columns', { watchDepth: 'collection' }],
    ['indexPattern', { watchDepth: 'reference' }],
    ['isLoading', { watchDepth: 'reference' }],
    ['onAddColumn', { watchDepth: 'reference', wrapApply: false }],
    ['onFilter', { watchDepth: 'reference', wrapApply: false }],
    ['onRemoveColumn', { watchDepth: 'reference', wrapApply: false }],
    ['onSetColumns', { watchDepth: 'reference', wrapApply: false }],
    ['onSort', { watchDepth: 'reference', wrapApply: false }],
    ['rows', { watchDepth: 'collection' }],
    ['sampleSize', { watchDepth: 'reference' }],
    ['searchDescription', { watchDepth: 'reference' }],
    ['searchTitle', { watchDepth: 'reference' }],
    ['settings', { watchDepth: 'reference' }],
    ['showTimeCol', { watchDepth: 'value' }],
    ['sort', { watchDepth: 'value' }],
    ['className', { watchDepth: 'value' }],
  ]);
}
