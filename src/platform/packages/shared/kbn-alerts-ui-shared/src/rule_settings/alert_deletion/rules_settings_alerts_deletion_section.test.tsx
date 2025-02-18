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
import { RulesSettingsAlertsDeletionSection } from './rules_settings_alerts_deletion_section';
import type { RulesSettingsAlertDeletionProperties } from '@kbn/alerting-types/rule_settings';

const initialSettings: RulesSettingsAlertDeletionProperties = {
  activeAlertsDeletionThreshold: 0,
  isActiveAlertsDeletionEnabled: true,
  inactiveAlertsDeletionThreshold: 0,
  isInactiveAlertsDeletionEnabled: true,
};

describe('RulesSettingsAlertsDeletionSection', () => {
  const noop = () => {};

  test('should enable the active alert threshold input when the active alert switch is enabled', async () => {
    render(
      <RulesSettingsAlertsDeletionSection
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
      isActiveAlertsDeletionEnabled: false,
    };

    render(
      <RulesSettingsAlertsDeletionSection
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
      <RulesSettingsAlertsDeletionSection
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
      isInactiveAlertsDeletionEnabled: false,
    };

    render(
      <RulesSettingsAlertsDeletionSection
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
      <RulesSettingsAlertsDeletionSection
        onChange={noop}
        settings={initialSettings}
        canWrite={true}
        hasError={true}
      />
    );

    expect(screen.getByTestId('rulesSettingsAlertDeletionErrorPrompt')).toBeInTheDocument();
  });
});
