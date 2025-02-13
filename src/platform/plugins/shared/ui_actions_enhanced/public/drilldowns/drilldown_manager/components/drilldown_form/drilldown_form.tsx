/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';
import { EuiFieldText, EuiForm, EuiFormRow, EuiSpacer, EuiCallOut, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TriggerPicker, TriggerPickerProps } from '../trigger_picker';

const txtNameOfDrilldown = i18n.translate(
  'uiActionsEnhanced.components.DrilldownForm.nameOfDrilldown',
  {
    defaultMessage: 'Name',
  }
);

const txtUntitledDrilldown = i18n.translate(
  'uiActionsEnhanced.components.DrilldownForm.untitledDrilldown',
  {
    defaultMessage: 'Untitled drilldown',
  }
);

const txtTrigger = i18n.translate('uiActionsEnhanced.components.DrilldownForm.trigger', {
  defaultMessage: 'Trigger',
});

export interface FormDrilldownWizardProps {
  /** Value of name field. */
  name?: string;

  /** Callback called on name change. */
  onNameChange?: (name: string) => void;

  /** Trigger picker props. */
  triggers?: TriggerPickerProps;

  /** Whether the form elements should be disabled. */
  disabled?: boolean;
}

export const DrilldownForm: FC<PropsWithChildren<FormDrilldownWizardProps>> = ({
  name = '',
  onNameChange,
  triggers,
  disabled,
  children,
}) => {
  if (!!triggers && !triggers.items.length) {
    // Below callout is not translated, because this message is only for developers.
    return (
      <EuiCallOut title="Sorry, there was an error" color="danger" iconType="warning">
        <p>
          No triggers provided in <EuiCode>triggers</EuiCode> prop.
        </p>
      </EuiCallOut>
    );
  }

  const nameFragment = (
    <EuiFormRow label={txtNameOfDrilldown}>
      <EuiFieldText
        name="drilldown_name"
        placeholder={txtUntitledDrilldown}
        value={name}
        disabled={!onNameChange || disabled}
        onChange={!!onNameChange ? (event) => onNameChange(event.target.value) : undefined}
        data-test-subj="drilldownNameInput"
      />
    </EuiFormRow>
  );

  const triggersFragment = !!triggers && triggers.items.length > 0 && (
    <EuiFormRow label={txtTrigger} fullWidth={true}>
      <TriggerPicker {...triggers} disabled={disabled} />
    </EuiFormRow>
  );

  return (
    <EuiForm data-test-subj={`DrilldownForm`}>
      <EuiSpacer size={'m'} />
      {nameFragment}
      <EuiSpacer size={'m'} />
      {triggersFragment}
      <EuiSpacer size={'m'} />
      <div>{children}</div>
    </EuiForm>
  );
};
