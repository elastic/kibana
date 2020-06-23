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
import {
  EuiPageContentBody,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFieldNumber,
} from '@elastic/eui';
import { ISearchGeneric } from '../../../src/plugins/data/public';
import { DoSearch } from './do_search';
import { GuideSection } from './guide_section';

import { ASYNC_DEMO_SEARCH_STRATEGY, IAsyncDemoRequest } from '../../demo_search/common';

// @ts-ignore
import demoStrategyServerProvider from '!!raw-loader!./../../demo_search/server/async_demo_search_strategy';
// @ts-ignore
import demoStrategyPublicProvider from '!!raw-loader!./../../demo_search/public/async_demo_search_strategy';
// @ts-ignore
import demoStrategyServerPlugin from '!!raw-loader!./../../demo_search/server/plugin';
// @ts-ignore
import demoStrategyPublicPlugin from '!!raw-loader!./../../demo_search/public/plugin';

interface Props {
  search: ISearchGeneric;
}

interface State {
  searching: boolean;
  fibonacciNumbers: number;
  changes: boolean;
  error?: any;
}

export class AsyncDemoStrategy extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      searching: false,
      changes: false,
      fibonacciNumbers: 5,
    };
  }

  renderDemo = () => {
    const request: IAsyncDemoRequest = {
      fibonacciNumbers: this.state.fibonacciNumbers,
    };
    return (
      <React.Fragment>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="How many Fibonacci numbers to generate?">
              <EuiFieldNumber
                value={this.state.fibonacciNumbers}
                onChange={(e) => this.setState({ fibonacciNumbers: parseFloat(e.target.value) })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <DoSearch
          request={request}
          strategy={ASYNC_DEMO_SEARCH_STRATEGY}
          search={(signal: AbortSignal) =>
            this.props.search(request, { signal }, ASYNC_DEMO_SEARCH_STRATEGY)
          }
        />
      </React.Fragment>
    );
  };

  render() {
    return (
      <EuiPageContentBody>
        <GuideSection
          codeSections={[
            {
              title: 'Public',
              code: [
                { description: 'plugin.ts', snippet: demoStrategyPublicPlugin },
                {
                  description: 'async_demo_search_strategy.ts',
                  snippet: demoStrategyPublicProvider,
                },
              ],
            },
            {
              title: 'Server',
              code: [
                { description: 'plugin.ts', snippet: demoStrategyServerPlugin },
                {
                  description: 'async_demo_search_strategy.ts',
                  snippet: demoStrategyServerProvider,
                },
              ],
            },
          ]}
          demo={this.renderDemo()}
        />
      </EuiPageContentBody>
    );
  }
}
