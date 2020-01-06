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

import { KuiBar, KuiBarSection, KuiButton, KuiButtonGroup } from '../../../../components';

export default () => (
  <KuiBar>
    <KuiBarSection>
      <div className="kuiTitle">The Great American Novel</div>
    </KuiBarSection>

    <KuiBarSection>
      <KuiButtonGroup>
        <KuiButton buttonType="basic">Create new page</KuiButton>
        <KuiButton buttonType="danger">Clear all pages</KuiButton>
      </KuiButtonGroup>
    </KuiBarSection>

    <KuiBarSection>
      <label htmlFor="limitInput">Limit to</label>
      <input id="limitInput" className="kuiTextInput" size="2" value="10" readOnly />
      <div>pages</div>

      <KuiButtonGroup>
        <KuiButton buttonType="basic">Undo</KuiButton>
        <KuiButton buttonType="basic">Redo</KuiButton>
      </KuiButtonGroup>
    </KuiBarSection>
  </KuiBar>
);
