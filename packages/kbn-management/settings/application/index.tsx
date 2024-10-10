/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { OutPortal } from 'react-reverse-portal';
import { SettingFlyoutFooterPortal } from '@kbn/management-settings-components-form/form';
import { SettingsApplication } from './application';
import {
  SettingsApplicationKibanaDependencies,
  SettingsApplicationKibanaProvider,
} from './services';

export { SettingsApplication } from './application';
export {
  SettingsApplicationProvider,
  SettingsApplicationKibanaProvider,
  type SettingsApplicationServices,
  type SettingsApplicationKibanaDependencies,
} from './services';

export const SettingFlyoutFooterOutPortalComponent = () => (
  <OutPortal node={SettingFlyoutFooterPortal} />
);

export const KibanaSettingsApplication = ({
  docLinks,
  i18n,
  notifications,
  settings,
  theme,
  history,
  sectionRegistry,
  application,
  chrome,
}: SettingsApplicationKibanaDependencies) => (
  <SettingsApplicationKibanaProvider
    {...{
      settings,
      theme,
      i18n,
      notifications,
      docLinks,
      history,
      sectionRegistry,
      application,
      chrome,
    }}
  >
    <SettingsApplication />
  </SettingsApplicationKibanaProvider>
);
