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

import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiFieldGroup,
  KuiFieldGroupSection,
  KuiPopover,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  onButtonClick() {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  closePopover() {
    this.setState({
      isPopoverOpen: false,
    });
  }

  render() {
    const button = (
      <KuiButton buttonType="basic" onClick={this.onButtonClick.bind(this)}>
        Show popover
      </KuiButton>
    );

    return (
      <KuiPopover
        ownFocus
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
      >
        <div style={{ width: '300px' }}>
          <div className="kuiVerticalRhythmSmall">
            <KuiFieldGroup>
              <KuiFieldGroupSection isWide>
                <div className="kuiSearchInput">
                  <div className="kuiSearchInput__icon kuiIcon fa-search" />
                  <input
                    className="kuiSearchInput__input"
                    type="text"
                  />
                </div>
              </KuiFieldGroupSection>

              <KuiFieldGroupSection>
                <select className="kuiSelect">
                  <option>Animal</option>
                  <option>Mineral</option>
                  <option>Vegetable</option>
                </select>
              </KuiFieldGroupSection>
            </KuiFieldGroup>
          </div>

          <div className="kuiVerticalRhythmSmall">
            <KuiButton buttonType="primary">Save</KuiButton>
          </div>
        </div>
      </KuiPopover>
    );
  }
}
