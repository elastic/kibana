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
  EuiFieldText,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import {
  ISearchGeneric,
  IEsSearchResponse,
  IEsSearchRequest,
} from '../../../src/plugins/data/public';
import { DoSearch } from './do_search';
import { GuideSection } from './guide_section';

// @ts-ignore
import serverPlugin from '!!raw-loader!./../../../src/plugins/data/server/search/es_search/es_search_service';
// @ts-ignore
import serverStrategy from '!!raw-loader!./../../../src/plugins/data/server/search/es_search/es_search_strategy';

// @ts-ignore
import publicStrategy from '!!raw-loader!./../../../src/plugins/data/public/search/es_search/es_search_strategy';

interface Props {
  search: ISearchGeneric;
}

interface State {
  query: string;
  results?: IEsSearchResponse;
  index: string;
  searching: boolean;
  request: IEsSearchRequest;
  strategy?: string;
  changes: boolean;
  error?: any;
}

export class EsSearchTest extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      query: '*',
      index: '*',
      searching: false,
      request: this.getRequest({ index: '*', query: '*' }),
      changes: false,
    };
  }

  getRequest({ index, query }: { index: string; query: string }): IEsSearchRequest {
    return {
      debug: true,
      params: {
        index,
        body: {
          query: {
            query_string: {
              query,
            },
          },
        },
      },
    };
  }

  renderDemo() {
    const request: IEsSearchRequest = this.getRequest(this.state);
    return (
      <React.Fragment>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Index pattern">
              <EuiFieldText
                value={this.state.index}
                onChange={e => this.setState({ index: e.target.value, changes: true })}
              />
            </EuiFormRow>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFormRow label="Query string query">
              <EuiFieldText
                value={this.state.query}
                onChange={e => this.setState({ query: e.target.value, changes: true })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <DoSearch
          request={request}
          search={(signal: AbortSignal) => this.props.search(request, { signal })}
        />
      </React.Fragment>
    );
  }

  render() {
    return (
      <EuiPageContentBody>
        <GuideSection
          codeSections={[
            {
              title: 'Public',
              code: [{ description: 'es_search_strategy.ts', snippet: publicStrategy }],
            },
            {
              title: 'Server',
              code: [
                { description: 'es_search_service.ts', snippet: serverPlugin },
                { description: 'es_search_strategy.ts', snippet: serverStrategy },
              ],
            },
          ]}
          demo={this.renderDemo()}
        />
      </EuiPageContentBody>
    );
  }
}
