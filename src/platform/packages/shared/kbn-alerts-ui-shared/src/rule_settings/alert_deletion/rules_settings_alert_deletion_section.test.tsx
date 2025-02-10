/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RulesSettingsAlertDeletionSection } from './rules_settings_alert_deletion_section';
import { RulesSettingsAlertsDeletionProperties } from '@kbn/alerting-types/rule_settings';

const initialSettings: RulesSettingsAlertsDeletionProperties = {
  activeAlertsDeletionThreshold: 0,
  isActiveAlertsDeletionEnabled: true,
  inactiveAlertsDeletionThreshold: 0,
  isInactiveAlertsDeletionEnabled: true,
};

describe('RulesSettingsAlertDeletionSection', () => {
  const noop = () => {};

  test('should enable the active alert threshold input when the active alert switch is enabled', async () => {
    render(
      <RulesSettingsAlertDeletionSection
        onChange={noop}
        settings={initialSettings}
        canWrite={true}
        hasError={false}
      />
    );

    expect(await screen.findByTestId('rulesSettingsActiveAlertDeletionThreshold')).toBeEnabled();
  });

  test('should disable the active alert threshold input when the active alert switch is disabled', async () => {
    const settings = {
      ...initialSettings,
      isActiveAlertDeletionEnabled: false,
    };

    render(
      <RulesSettingsAlertDeletionSection
        onChange={noop}
        settings={settings}
        canWrite={true}
        hasError={false}
      />
    );

    const activeAlertThreshold = await screen.findByTestId(
      'rulesSettingsActiveAlertDeletionThreshold'
    );
    expect(activeAlertThreshold).toBeDisabled();
  });

  test('should enable the inactive alert threshold input when the inactive alert switch is enabled', async () => {
    render(
      <RulesSettingsAlertDeletionSection
        onChange={noop}
        settings={initialSettings}
        canWrite={true}
        hasError={false}
      />
    );

    expect(await screen.findByTestId('rulesSettingsInactiveAlertDeletionThreshold')).toBeEnabled();
  });

  test('should disable the inactive alert threshold input when the inactive alert switch is disabled', async () => {
    const settings = {
      ...initialSettings,
      isInactiveAlertDeletionEnabled: false,
    };

    render(
      <RulesSettingsAlertDeletionSection
        onChange={noop}
        settings={settings}
        canWrite={true}
        hasError={false}
      />
    );

    expect(await screen.findByTestId('rulesSettingsInactiveAlertDeletionThreshold')).toBeDisabled();
  });

  test('should show error message when error', () => {
    render(
      <RulesSettingsAlertDeletionSection
        onChange={noop}
        settings={initialSettings}
        canWrite={true}
        hasError={true}
      />
    );

    expect(screen.getByTestId('rulesSettingsAlertDeletionErrorPrompt')).toBeInTheDocument();
  });
});
