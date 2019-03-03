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

import React, { ChangeEvent } from 'react';

import { EuiButtonEmpty, EuiCheckbox, EuiFormRow } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';

export interface EventActionsMenuFormProps {
  clickOverride?: boolean;
  onReset: () => void;
  onChange: (clickOverride: boolean) => void;
}

interface EventActionsMenuFormUiProps extends EventActionsMenuFormProps {
  intl: InjectedIntl;
}

function EventActionOptionsMenuFormUi({
  clickOverride,
  onChange,
  onReset,
  intl,
}: EventActionsMenuFormUiProps) {

  function onOverrideChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.checked);
  }

  return (
    <div className="dshPanel__optionsMenuForm" data-test-subj="dashboardEventActionsInputMenuItem">
      <EuiFormRow
        label={intl.formatMessage({
          id: 'kbn.dashboard.panel.eventActionsForm.panelTitleFormRowLabel',
          defaultMessage: 'Click',
        })}
      >
        <EuiCheckbox
          id="eventActionInput"
          label="Override click to navigate"
          checked={clickOverride}
          onChange={onOverrideChange}
        />
      </EuiFormRow>

      <EuiButtonEmpty data-test-subj="resetEventActionsToDefault" onClick={onReset}>
        <FormattedMessage
          id="kbn.dashboard.panel.eventActionsForm.resetToDefaultButtonLabel"
          defaultMessage="Reset to default"
        />
      </EuiButtonEmpty>
    </div>
  );
}


export const EventActionOptionsMenuForm = injectI18n(EventActionOptionsMenuFormUi);
