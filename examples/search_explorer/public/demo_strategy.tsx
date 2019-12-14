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
  EuiFieldText,
} from '@elastic/eui';
import { ISearchGeneric } from '../../../src/plugins/data/public';
import { DoSearch } from './do_search';
import { GuideSection } from './guide_section';

import { DEMO_SEARCH_STRATEGY } from '../../demo_search/public';

import { IDemoResponse, IDemoRequest } from '../../demo_search/common';

// @ts-ignore
import doSearch from '!!raw-loader!./do_search.tsx';
// @ts-ignore
import demoStrategyServerProvider from '!!raw-loader!./../../demo_search/server/demo_search_strategy';
// @ts-ignore
import demoStrategyPublicProvider from '!!raw-loader!./../../demo_search/public/demo_search_strategy';
// @ts-ignore
import demoStrategyServerPlugin from '!!raw-loader!./../../demo_search/server/plugin';
// @ts-ignore
import demoStrategyPublicPlugin from '!!raw-loader!./../../demo_search/public/plugin';

interface Props {
  search: ISearchGeneric;
}

interface State {
  results?: IDemoResponse;
  searching: boolean;
  name: string;
  mood: string;
  changes: boolean;
  error?: any;
}

export class DemoStrategy extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      searching: false,
      changes: false,
      name: 'Molly',
      mood: 'happy',
    };
  }

  renderDemo = () => {
    const request: IDemoRequest = {
      name: this.state.name,
      mood: this.state.mood,
    };
    return (
      <React.Fragment>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="What is your name?">
              <EuiFieldText
                value={this.state.name}
                onChange={e => this.setState({ name: e.target.value })}
              />
            </EuiFormRow>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFormRow label="How are you feeling today?">
              <EuiFieldText
                value={this.state.mood}
                onChange={e => this.setState({ mood: e.target.value })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <DoSearch
          request={request}
          strategy={DEMO_SEARCH_STRATEGY}
          search={(signal: AbortSignal) =>
            this.props.search(request, { signal }, DEMO_SEARCH_STRATEGY)
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
                { description: 'demo_search_strategy.ts', snippet: demoStrategyPublicProvider },
              ],
            },
            {
              title: 'Server',
              code: [
                { description: 'plugin.ts', snippet: demoStrategyServerPlugin },
                { description: 'demo_search_strategy.ts', snippet: demoStrategyServerProvider },
              ],
            },
          ]}
          demo={this.renderDemo()}
        />
      </EuiPageContentBody>
    );
  }
}
