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

import React, { ChangeEvent, KeyboardEvent } from 'react';

import { EuiButtonEmpty, EuiFieldText, EuiFormRow, keyCodes } from '@elastic/eui';

export interface PanelOptionsMenuFormProps {
  title?: string;
  onReset: () => void;
  onUpdatePanelTitle: (newPanelTitle: string) => void;
  onClose: () => void;
}

export function PanelOptionsMenuForm({
  title,
  onReset,
  onUpdatePanelTitle,
  onClose,
}: PanelOptionsMenuFormProps) {
  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    onUpdatePanelTitle(event.target.value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.keyCode === keyCodes.ENTER) {
      onClose();
    }
  }

  return (
    <div className="dshPanel__optionsMenuForm" data-test-subj="dashboardPanelTitleInputMenuItem">
      <EuiFormRow label="Panel title">
        <EuiFieldText
          id="panelTitleInput"
          data-test-subj="customDashboardPanelTitleInput"
          name="min"
          type="text"
          value={title}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          aria-label="Changes to this input are applied immediately. Press enter to exit."
        />
      </EuiFormRow>

      <EuiButtonEmpty data-test-subj="resetCustomDashboardPanelTitle" onClick={onReset}>
        Reset title
      </EuiButtonEmpty>
    </div>
  );
}
