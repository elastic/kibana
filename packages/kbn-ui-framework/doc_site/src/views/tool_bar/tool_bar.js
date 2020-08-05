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
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiButton,
  KuiButtonIcon,
  KuiButtonGroup,
} from '../../../../components';

export const ToolBar = () => (
  <KuiToolBar>
    <KuiToolBarSearchBox onFilter={() => {}} />

    <div>
      <select className="kuiSelect">
        <option>Past hour</option>
        <option>Past day</option>
        <option>Past week</option>
      </select>
    </div>

    <div className="kuiToolBarSection">
      <KuiButton buttonType="primary" icon={<KuiButtonIcon type="create" />}>
        Create
      </KuiButton>

      <KuiButton buttonType="danger" icon={<KuiButtonIcon type="delete" />}>
        Delete
      </KuiButton>
    </div>

    <div className="kuiToolBarSection">
      <div className="kuiToolBarText">1 &ndash; 20 of 33</div>

      <KuiButtonGroup isUnited>
        <KuiButton
          buttonType="basic"
          aria-label="Previous"
          icon={<KuiButtonIcon type="previous" />}
        />
        <KuiButton buttonType="basic" aria-label="Next" icon={<KuiButtonIcon type="next" />} />
      </KuiButtonGroup>
    </div>
  </KuiToolBar>
);
