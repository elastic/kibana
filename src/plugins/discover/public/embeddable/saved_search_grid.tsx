/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useMemo, useState, memo } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DiscoverGrid, DiscoverGridProps } from '../components/discover_grid/discover_grid';
import { getServices } from '../kibana_services';
import { TotalDocuments } from '../application/main/components/total_documents/total_documents';
import { ElasticSearchHit } from '../types';
import { SavedSearch } from '..';

export interface DiscoverGridEmbeddableProps extends DiscoverGridProps {
  savedSearch: SavedSearch;
  totalHitCount: number;
}

export const DataGridMemoized = memo(DiscoverGrid);

export function DiscoverGridEmbeddable(props: DiscoverGridEmbeddableProps) {
  const [expandedDoc, setExpandedDoc] = useState<ElasticSearchHit | undefined>(undefined);

  const services = useMemo(() => getServices(), []);

  return (
    <I18nProvider>
      <EuiFlexGroup style={{ width: '100%' }} direction="column" gutterSize="xs" responsive={false}>
        {props.totalHitCount !== 0 && (
          <EuiFlexItem grow={false} style={{ alignSelf: 'flex-end' }}>
            <TotalDocuments totalHitCount={props.totalHitCount} />
          </EuiFlexItem>
        )}
        <EuiFlexItem style={{ minHeight: 0 }}>
          <DataGridMemoized
            {...props}
            services={services}
            setExpandedDoc={setExpandedDoc}
            expandedDoc={expandedDoc}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </I18nProvider>
  );
}
