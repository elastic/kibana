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
import React from 'react';
import { DiscoverMemoized } from './discover';
import { DiscoverProps } from './discover_legacy';

class DiscoverWrapper extends React.Component<DiscoverProps> {
  shouldComponentUpdate(nextProps: Readonly<DiscoverProps>): boolean {
    for (const [k, v] of Object.entries(this.props)) {
      // @ts-ignore
      if (typeof v !== 'function' && v !== nextProps[k]) {
        return true;
      }
    }
    return false;
  }

  componentDidUpdate(prevProps: Readonly<DiscoverProps>) {
    for (const [k, v] of Object.entries(this.props)) {
      // @ts-ignore
      if (typeof v !== 'function' && v !== prevProps[k]) {
        // console.log(`Prop '${k}' changed`, { old: prevProps[k], new: v });
      }
    }
  }
  public render() {
    if (!this.props.resultState) {
      return null;
    }
    return <DiscoverMemoized {...this.props} />;
  }
}

export function createDiscoverDirective(reactDirective: any) {
  return reactDirective(DiscoverWrapper, [
    ['fetch', { watchDepth: 'reference' }],
    ['fetchCounter', { watchDepth: 'reference' }],
    ['fetchError', { watchDepth: 'reference' }],
    ['fieldCounts', { watchDepth: 'reference' }],
    ['histogramData', { watchDepth: 'reference' }],
    ['hits', { watchDepth: 'reference' }],
    ['indexPattern', { watchDepth: 'reference' }],
    ['onAddColumn', { watchDepth: 'reference' }],
    ['onAddFilter', { watchDepth: 'reference' }],
    ['onChangeInterval', { watchDepth: 'reference' }],
    ['onRemoveColumn', { watchDepth: 'reference' }],
    ['onSetColumns', { watchDepth: 'reference' }],
    ['onSort', { watchDepth: 'reference' }],
    ['opts', { watchDepth: 'reference' }],
    ['resetQuery', { watchDepth: 'reference' }],
    ['resultState', { watchDepth: 'reference' }],
    ['rows', { watchDepth: 'reference' }],
    ['searchSource', { watchDepth: 'reference' }],
    ['setColumns', { watchDepth: 'reference' }],
    ['setIndexPattern', { watchDepth: 'reference' }],
    ['showSaveQuery', { watchDepth: 'reference' }],
    ['state', { watchDepth: 'reference' }],
    ['timefilterUpdateHandler', { watchDepth: 'reference' }],
    ['timeRange', { watchDepth: 'reference' }],
    ['topNavMenu', { watchDepth: 'reference' }],
    ['updateQuery', { watchDepth: 'reference' }],
    ['updateSavedQueryId', { watchDepth: 'reference' }],
  ]);
}
