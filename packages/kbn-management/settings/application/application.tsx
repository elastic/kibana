/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

import { SettingsStart } from '@kbn/core-ui-settings-browser';
import { Form } from '@kbn/management-settings-components-form';

import { EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFields } from './hooks/use_fields';

const title = i18n.translate('management.settings.advancedSettingsLabel', {
  defaultMessage: 'Settings',
});

export interface SettingsApplicationProps {
  settingsStart: SettingsStart;
}

export const SettingsApplication = ({ settingsStart }: SettingsApplicationProps) => {
  const fields = useFields(settingsStart.client);

  return (
    <div>
      <EuiText>
        <h1 data-test-subj="managementSettingsTitle">{title}</h1>
      </EuiText>
      <EuiSpacer size="xxl" />
      <Form fields={fields} isSavingEnabled={true} />
    </div>
  );
};
