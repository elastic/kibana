/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

import { Form } from '@kbn/management-settings-components-form';

import { EuiText, EuiSpacer } from '@elastic/eui';
import { i18n as i18nLib } from '@kbn/i18n';
import { useFields } from './hooks/use_fields';

const title = i18nLib.translate('management.settings.advancedSettingsLabel', {
  defaultMessage: 'Advanced Settings',
});

export const DATA_TEST_SUBJ_SETTINGS_TITLE = 'managementSettingsTitle';

/**
 * Component for displaying a {@link Form} component.
 * @param props The {@link SettingsApplicationProps} for the {@link SettingsApplication} component.
 */
export const SettingsApplication = () => {
  const fields = useFields();

  return (
    <div>
      <EuiText>
        <h1 data-test-subj={DATA_TEST_SUBJ_SETTINGS_TITLE}>{title}</h1>
      </EuiText>
      <EuiSpacer size="xxl" />
      <Form fields={fields} isSavingEnabled={true} />
    </div>
  );
};
