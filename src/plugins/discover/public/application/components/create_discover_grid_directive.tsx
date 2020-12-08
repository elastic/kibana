/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import * as React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { DiscoverGrid, DiscoverGridProps } from './discover_grid/discover_grid';
import { getServices } from '../../kibana_services';

export const DataGridMemoized = React.memo((props: DiscoverGridProps) => (
  <DiscoverGrid {...props} />
));

export function DiscoverGridEmbeddable(props: DiscoverGridProps) {
  return (
    <I18nProvider>
      <DataGridMemoized {...props} services={getServices()} />
    </I18nProvider>
  );
}

/**
 * this is just needed for the embeddable
 */
export function createDiscoverGridDirective(reactDirective: any) {
  return reactDirective(DiscoverGridEmbeddable, [
    ['columns', { watchDepth: 'collection' }],
    ['indexPattern', { watchDepth: 'reference' }],
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
  ]);
}
