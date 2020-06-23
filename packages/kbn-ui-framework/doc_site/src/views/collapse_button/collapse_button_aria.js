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

import { KuiCollapseButton } from '../../../../components';

import { htmlIdGenerator } from '../../../../src/services';

export default class extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isExpanded: false,
    };
  }

  onToggleContent = (ev) => {
    ev.preventDefault();
    this.setState((state) => ({
      isExpanded: !state.isExpanded,
    }));
  };

  render() {
    const { isExpanded } = this.state;
    const idGen = htmlIdGenerator();
    return (
      <div>
        <KuiCollapseButton
          onClick={this.onToggleContent}
          direction={isExpanded ? 'down' : 'up'}
          aria-label="Toggle panel"
          aria-expanded={isExpanded}
          aria-controls={idGen('collapsible')}
        />
        <div id={idGen('collapsible')} style={{ display: isExpanded ? 'block' : 'none' }}>
          Here is some collapsible content.
        </div>
      </div>
    );
  }
}
