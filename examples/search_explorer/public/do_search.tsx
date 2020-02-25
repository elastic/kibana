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
import { EuiButton, EuiCodeBlock, EuiFlexItem, EuiFlexGroup, EuiText } from '@elastic/eui';
import { EuiProgress } from '@elastic/eui';
import { Observable } from 'rxjs';
import { IKibanaSearchResponse, IKibanaSearchRequest } from '../../../src/plugins/data/public';

interface Props {
  request: IKibanaSearchRequest;
  strategy?: string;
  search: (signal: AbortSignal) => Observable<IKibanaSearchResponse>;
}

interface State {
  searching: boolean;
  response?: IKibanaSearchResponse;
  error?: any;
}

export class DoSearch extends React.Component<Props, State> {
  private abortController?: AbortController;

  constructor(props: Props) {
    super(props);

    this.state = {
      searching: false,
      response: undefined,
    };
  }

  search = async () => {
    if (this.state.searching && this.abortController) {
      this.abortController.abort();
    }

    this.setState({
      searching: true,
      response: undefined,
      error: undefined,
    });

    this.abortController = new AbortController();

    this.props.search(this.abortController.signal).subscribe(
      response => {
        this.setState({ response, error: undefined });
      },
      error => {
        this.setState({ error, searching: false, response: undefined });
      },
      () => {
        this.setState({ searching: false, error: undefined });
      }
    );
  };

  cancel = () => {
    if (this.abortController) {
      this.abortController.abort();
    }
  };

  render() {
    let responseStr = this.state.error
      ? JSON.stringify(this.state.error, null, 2)
      : JSON.stringify(this.state.response, null, 2);
    responseStr = responseStr ? responseStr.substring(0, 2000) : '';
    const requestStr = JSON.stringify(this.props.request, null, 2);
    return (
      <React.Fragment>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="doSearch" onClick={this.search}>
              Search
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton disabled={!this.state.searching} onClick={this.cancel}>
              Cancel
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText>Request:</EuiText>
            <EuiCodeBlock language="json" fontSize="m" paddingSize="m" color="dark">
              {this.props.strategy
                ? `data.search
(
  ${requestStr},
  "${this.props.strategy}"
)`
                : `data.search
(
${requestStr}
)`}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>Response:</EuiText>
            <EuiProgress
              value={(this.state.response && this.state.response.percentComplete) || 0}
              max={100}
            />
            <EuiCodeBlock
              language="json"
              fontSize="m"
              paddingSize="m"
              color="dark"
              data-test-subj="response"
            >
              {responseStr}
            </EuiCodeBlock>
          </EuiFlexItem>
        </EuiFlexGroup>
      </React.Fragment>
    );
  }
}
