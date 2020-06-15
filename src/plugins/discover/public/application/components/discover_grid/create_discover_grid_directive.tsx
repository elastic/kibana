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
import { DiscoverGrid } from './discover_grid';

interface Props<P> {
  [key: string]: any;
}

/**
 * TODO remove when development is finished, helper component to detect property changes
 * @param WrappedComponent
 */
export function withPropsChecker<P>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentClass<Props<P>> {
  // eslint-disable-next-line react/prefer-stateless-function
  return class PropsChecker extends React.Component<Props<P>> {
    /**
    componentWillReceiveProps(nextProps: Props<P>) {
      Object.keys(nextProps)
        .filter((key) => nextProps[key] !== this.props[key])
        .map((key) => {
          console.log('changed property:', key, 'from', this.props[key], 'to', nextProps[key]);
        });
    }
     **/

    render() {
      // @ts-ignore
      return <DiscoverGrid {...this.props} />;
    }
  };
}

export function createDiscoverGridDirective(reactDirective: any) {
  return reactDirective(withPropsChecker(DiscoverGrid), [
    ['columns', { watchDepth: 'collection' }],
    ['rows', { watchDepth: 'collection' }],
    ['indexPattern', { watchDepth: 'reference' }],
    ['sort', { watchDepth: 'value' }],
    ['sampleSize', { watchDepth: 'reference' }],
    ['searchDescription', { watchDepth: 'reference' }],
    ['searchTitle', { watchDepth: 'reference' }],
    ['useShortDots', { watchDepth: 'value' }],
    ['showTimeCol', { watchDepth: 'value' }],
    ['onFilter', { watchDepth: 'reference', wrapApply: false }],
    ['onRemoveColumn', { watchDepth: 'reference', wrapApply: false }],
    ['onAddColumn', { watchDepth: 'reference', wrapApply: false }],
    ['onSetColumns', { watchDepth: 'reference', wrapApply: false }],
    ['getContextAppHref', { watchDepth: 'reference', wrapApply: false }],
    ['onSort', { watchDepth: 'reference', wrapApply: false }],
  ]);
}
