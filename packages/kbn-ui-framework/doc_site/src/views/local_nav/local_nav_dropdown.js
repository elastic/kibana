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

import { KuiLocalNav, KuiLocalNavRow, KuiLocalNavRowSection } from '../../../../components';

export function LocalNavWithDropdown() {
  return (
    <KuiLocalNav>
      <KuiLocalNavRow>
        <KuiLocalNavRowSection>
          <div className="kuiLocalBreadcrumbs">
            <h1 tabIndex="0" id="kui_local_breadcrumb" className="kuiLocalBreadcrumb">
              <a className="kuiLocalBreadcrumb__link" href="#">
                Discover
              </a>
            </h1>
            <h1 tabIndex="0" id="kui_local_breadcrumb" className="kuiLocalBreadcrumb">
              <span className="kuiLocalBreadcrumb__emphasis">0</span> hits
            </h1>
          </div>
        </KuiLocalNavRowSection>
        <KuiLocalNavRowSection>
          <div className="kuiLocalMenu">
            <div className="kuiLocalMenuItem kuiLocalMenuItem-isSelected">New</div>
            <button className="kuiLocalMenuItem">Save</button>
            <button className="kuiLocalMenuItem">Open</button>
            <button className="kuiLocalMenuItem">
              <div className="kuiLocalMenuItem__icon kuiIcon fa-clock-o" />
              Last 5 minutes
            </button>
          </div>
        </KuiLocalNavRowSection>
      </KuiLocalNavRow>
      <div className="kuiLocalDropdown">
        {/* Dropdown close button */}
        <button className="kuiLocalDropdownCloseButton">
          <span className="fa fa-chevron-circle-up" />
        </button>

        {/* Title */}
        <div className="kuiLocalDropdownTitle">Dropdown title</div>

        {/* Help text */}
        <div className="kuiLocalDropdownHelpText">
          Here&rsquo;s some help text to explain the purpose of the dropdown.
        </div>

        {/* Warning */}
        <div className="kuiLocalDropdownWarning">
          Here&rsquo;s some warning text in case the user has something misconfigured.
        </div>

        <div className="kuiLocalDropdownSection">
          {/* Header */}
          <div className="kuiLocalDropdownHeader">
            <div className="kuiLocalDropdownHeader__label">Header for a section of content</div>
          </div>

          {/* Input */}
          <input className="kuiLocalDropdownInput" type="text" placeholder="Input something here" />
        </div>

        <div className="kuiLocalDropdownSection">
          {/* Header */}
          <div className="kuiLocalDropdownHeader">
            <div className="kuiLocalDropdownHeader__label">
              Header for another section of content
            </div>
            <div className="kuiLocalDropdownHeader__actions">
              <a className="kuiLocalDropdownHeader__action" href="">
                Action A
              </a>
              <a className="kuiLocalDropdownHeader__action" href="">
                Action B
              </a>
            </div>
          </div>

          <input
            className="kuiLocalDropdownInput"
            type="text"
            readOnly
            value="This is some text inside of a read-only input"
          />

          {/* Notes */}
          <div className="kuiLocalDropdownFormNote">
            Here are some notes to explain the purpose of this section of the dropdown.
          </div>
        </div>
      </div>
      <KuiLocalNavRow isSecondary>
        <div className="kuiLocalSearch">
          <input
            className="kuiLocalSearchInput"
            type="text"
            placeholder="Filter..."
            autoComplete="off"
          />
          <button className="kuiLocalSearchButton">
            <span className="kuiIcon fa-search" />
          </button>
        </div>
      </KuiLocalNavRow>
    </KuiLocalNav>
  );
}
