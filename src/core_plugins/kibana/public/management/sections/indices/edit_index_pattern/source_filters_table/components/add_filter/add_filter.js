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
import PropTypes from 'prop-types';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiButton,
} from '@elastic/eui';

export class AddFilter extends Component {
  static propTypes = {
    onAddFilter: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      filter: '',
    };
  }

  onAddFilter = () => {
    this.props.onAddFilter(this.state.filter);
    this.setState({ filter: '' });
  }

  render() {
    const { filter } = this.state;

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={10}>
          <EuiFieldText
            fullWidth
            value={filter}
            onChange={e => this.setState({ filter: e.target.value.trim() })}
            placeholder="source filter, accepts wildcards (e.g., `user*` to filter fields starting with 'user')"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            isDisabled={filter.length === 0}
            onClick={this.onAddFilter}
          >
            Add
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
