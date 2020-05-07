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
import { KuiTextInput } from '../../../../components';

class KuiTextInputExample extends Component {
  state = {
    value1: '',
    value2: 'Entered text',
    value3: '',
    value4: 'Disabled',
    value5: '',
    value6: '',
  };

  handleChange = (event, key) => {
    this.setState({ [key]: event.target.value });
  };

  render() {
    return (
      <div>
        <KuiTextInput
          value={this.state.value1}
          placeholder="Placeholder text"
          onChange={event => this.handleChange(event, 'value1')}
        />
        <hr className="guideBreak" />
        <KuiTextInput
          value={this.state.value2}
          autoFocus
          onChange={event => this.handleChange(event, 'value2')}
        />
        <hr className="guideBreak" />
        <KuiTextInput
          value={this.state.value3}
          isInvalid
          onChange={event => this.handleChange(event, 'value3')}
        />
        <hr className="guideBreak" />
        <KuiTextInput
          value={this.state.value4}
          isDisabled
          onChange={event => this.handleChange(event, 'value4')}
        />
        <hr className="guideBreak" />
        <KuiTextInput
          value={this.state.value5}
          size="small"
          placeholder="Small"
          onChange={event => this.handleChange(event, 'value5')}
        />
        <hr className="guideBreak" />
        <KuiTextInput
          value={this.state.value6}
          size="large"
          placeholder="Large"
          onChange={event => this.handleChange(event, 'value6')}
        />
      </div>
    );
  }
}

export default KuiTextInputExample;
