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
import { KuiSelect } from '../../../../components';

class KuiSelectExample extends Component {
  state = {
    value1: '',
    value2: '',
    value3: '',
    value4: '',
    value5: '',
  };

  handleChange = (event, key) => {
    this.setState({ [key]: event.target.value });
  };

  render() {
    return (
      <div>
        <KuiSelect value={this.state.value1} onChange={event => this.handleChange(event, 'value1')}>
          <option value="apple">Apple</option>
          <option value="bread">Bread</option>
          <option value="cheese">Cheese</option>
        </KuiSelect>
        <hr className="guideBreak" />
        <KuiSelect
          value={this.state.value2}
          onChange={event => this.handleChange(event, 'value2')}
          isDisabled
        >
          <option>Disabled</option>
        </KuiSelect>
        <hr className="guideBreak" />
        <KuiSelect
          value={this.state.value3}
          onChange={event => this.handleChange(event, 'value3')}
          isInvalid
        >
          <option>Invalid</option>
        </KuiSelect>
        <hr className="guideBreak" />
        <KuiSelect
          value={this.state.value4}
          onChange={event => this.handleChange(event, 'value4')}
          size="small"
        >
          <option>Small</option>
        </KuiSelect>
        <hr className="guideBreak" />
        <KuiSelect
          value={this.state.value5}
          onChange={event => this.handleChange(event, 'value5')}
          size="large"
        >
          <option>Large</option>
        </KuiSelect>
      </div>
    );
  }
}

export default KuiSelectExample;
