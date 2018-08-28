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
  KuiColorPicker,
  KuiFieldGroup,
  KuiFieldGroupSection,
} from '../../../../components';

export class ColorPickerNoColorLabel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      color: '#00FFFF'
    };
  }

  handleChange = (value) => {
    this.setState({ color: value });
  };

  render() {
    return (
      <KuiFieldGroup>
        <KuiFieldGroupSection>
          <label className="kuiLabel">
            Foreground color
          </label>
        </KuiFieldGroupSection>

        <KuiFieldGroupSection>
          <KuiColorPicker
            onChange={this.handleChange}
            color={this.state.color}
            showColorLabel={false}
          />
        </KuiFieldGroupSection>
      </KuiFieldGroup>
    );
  }
}
