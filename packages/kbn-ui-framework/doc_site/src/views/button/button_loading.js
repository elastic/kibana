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

import React, { Component } from 'react';

import { KuiButtonIcon, KuiButton } from '../../../../components';

export default class LoadingButton extends Component {
  constructor(props) {
    super();

    this.state = {
      isLoading: props.isLoading || false,
    };

    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.setState({
      isLoading: true,
    });

    setTimeout(() => {
      this.setState({
        isLoading: false,
      });
    }, 3000);
  }

  render() {
    return (
      <div>
        <KuiButton
          buttonType="basic"
          onClick={this.onClick}
          isLoading={this.state.isLoading}
          disabled={this.state.isLoading}
        >
          {this.state.isLoading ? 'Loading...' : 'Load more'}
        </KuiButton>

        <br />
        <br />

        <KuiButton
          buttonType="primary"
          onClick={this.onClick}
          icon={<KuiButtonIcon type="create" />}
          isLoading={this.state.isLoading}
          disabled={this.state.isLoading}
        >
          {this.state.isLoading ? 'Creating...' : 'Create'}
        </KuiButton>
      </div>
    );
  }
}
