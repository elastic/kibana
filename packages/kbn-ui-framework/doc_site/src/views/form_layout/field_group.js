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
  KuiFieldGroup,
  KuiFieldGroupSection,
  KuiButton,
  KuiButtonIcon,
  KuiButtonGroup,
} from '../../../../components';

export default () => (
  <div>
    <KuiFieldGroup>
      <KuiFieldGroupSection isWide>
        <div className="kuiSearchInput">
          <div className="kuiSearchInput__icon kuiIcon fa-search" />
          <input className="kuiSearchInput__input" type="text" />
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

    <br className="guideBreak" />

    <KuiFieldGroup>
      <KuiFieldGroupSection>
        <input className="kuiTextInput" placeholder="http://" type="text" />
      </KuiFieldGroupSection>

      <KuiFieldGroupSection>
        <KuiButton buttonType="primary">Ping</KuiButton>
      </KuiFieldGroupSection>
    </KuiFieldGroup>

    <br className="guideBreak" />

    <KuiFieldGroup isAlignedTop>
      <KuiFieldGroupSection>
        <textarea className="kuiTextArea" placeholder="http://" type="text" rows="5" />
      </KuiFieldGroupSection>

      <KuiFieldGroupSection>
        <KuiButton buttonType="primary">Ping</KuiButton>
      </KuiFieldGroupSection>
    </KuiFieldGroup>

    <br className="guideBreak" />

    <KuiFieldGroup>
      <KuiFieldGroupSection>
        <input className="kuiTextInput" type="text" />
      </KuiFieldGroupSection>

      <KuiFieldGroupSection>
        <KuiButtonGroup>
          <KuiButton
            buttonType="basic"
            className="kuiButton--small"
            aria-label="Increase"
            icon={<KuiButtonIcon className="fa-plus" />}
          />

          <KuiButton
            buttonType="basic"
            className="kuiButton--small"
            aria-label="Decrease"
            icon={<KuiButtonIcon className="fa-minus" />}
          />

          <KuiButton
            buttonType="danger"
            className="kuiButton--small"
            aria-label="Remove"
            icon={<KuiButtonIcon className="fa-trash" />}
          />
        </KuiButtonGroup>
      </KuiFieldGroupSection>
    </KuiFieldGroup>
  </div>
);
