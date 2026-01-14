/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { RulesSettingsFlapping } from '@kbn/alerting-types';
import { RuleSettingsFlappingForm } from '.';

const TestProviders: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const queryClient = new QueryClient();
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nProvider>
  );
};

const spaceFlappingSettings: RulesSettingsFlapping = {
  enabled: true,
  lookBackWindow: 20,
  statusChangeThreshold: 4,
  createdBy: null,
  updatedBy: null,
  createdAt: '12-10-2025',
  updatedAt: '12-10-2025',
};

describe('RuleSettingsFlappingForm', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('should show custom configuration switch as off if global flapping is enabled', async () => {
    const onFlappingChangeMock = jest.fn();
    const result = render(
      <RuleSettingsFlappingForm
        spaceFlappingSettings={spaceFlappingSettings}
        canWriteFlappingSettingsUI={true}
        onFlappingChange={onFlappingChangeMock}
      />,
      { wrapper: TestProviders }
    );

    expect(
      result.getByTestId('rulesSettingsFlappingEnableSwitch').getAttribute('aria-checked')
    ).toBe('true');
    expect(
      result.getByTestId('rulesSettingsFlappingCustomSwitch').getAttribute('aria-checked')
    ).toBe('false');
    expect(result.queryByTestId('rulesSettingsFlappingCustomBadge')).not.toBeInTheDocument();
    expect(onFlappingChangeMock).not.toHaveBeenCalled();
  });

  it('should show custom badge if global flapping is enabled and rule flapping is disabled', async () => {
    let flappingSettings = null;
    const onFlappingChangeMock = jest.fn((changes) => {
      flappingSettings = changes;
    });

    const result = render(
      <RuleSettingsFlappingForm
        flappingSettings={flappingSettings}
        spaceFlappingSettings={spaceFlappingSettings}
        canWriteFlappingSettingsUI={true}
        onFlappingChange={onFlappingChangeMock}
      />,
      { wrapper: TestProviders }
    );

    expect(
      result.getByTestId('rulesSettingsFlappingEnableSwitch').getAttribute('aria-checked')
    ).toBe('true');

    const enableSwitch = screen.getByTestId('rulesSettingsFlappingEnableSwitch');
    fireEvent.click(enableSwitch);

    result.rerender(
      <RuleSettingsFlappingForm
        flappingSettings={flappingSettings}
        spaceFlappingSettings={spaceFlappingSettings}
        canWriteFlappingSettingsUI={true}
        onFlappingChange={onFlappingChangeMock}
      />
    );

    expect(
      result.getByTestId('rulesSettingsFlappingEnableSwitch').getAttribute('aria-checked')
    ).toBe('false');
    expect(result.queryByTestId('rulesSettingsFlappingCustomSwitch')).not.toBeInTheDocument();
    expect(result.getByTestId('rulesSettingsFlappingCustomBadge')).toBeInTheDocument();
    expect(onFlappingChangeMock).toHaveBeenCalledWith({
      enabled: false,
      lookBackWindow: 20,
      statusChangeThreshold: 4,
    });
  });

  it('should show custom badge and custom form if global flapping is enabled and custom configuration switch is on ', async () => {
    let flappingSettings = null;
    const onFlappingChangeMock = jest.fn((changes) => {
      flappingSettings = changes;
    });

    const result = render(
      <RuleSettingsFlappingForm
        flappingSettings={flappingSettings}
        spaceFlappingSettings={spaceFlappingSettings}
        canWriteFlappingSettingsUI={true}
        onFlappingChange={onFlappingChangeMock}
      />,
      { wrapper: TestProviders }
    );

    expect(
      result.getByTestId('rulesSettingsFlappingEnableSwitch').getAttribute('aria-checked')
    ).toBe('true');
    expect(
      result.getByTestId('rulesSettingsFlappingCustomSwitch').getAttribute('aria-checked')
    ).toBe('false');

    const customSwitch = screen.getByTestId('rulesSettingsFlappingCustomSwitch');
    fireEvent.click(customSwitch);

    result.rerender(
      <RuleSettingsFlappingForm
        flappingSettings={flappingSettings}
        spaceFlappingSettings={spaceFlappingSettings}
        canWriteFlappingSettingsUI={true}
        onFlappingChange={onFlappingChangeMock}
      />
    );

    expect(
      result.getByTestId('rulesSettingsFlappingCustomSwitch').getAttribute('aria-checked')
    ).toBe('true');
    expect(result.getByTestId('rulesSettingsFlappingCustomBadge')).toBeInTheDocument();
    expect(onFlappingChangeMock).toHaveBeenCalledWith({
      enabled: true,
      lookBackWindow: 20,
      statusChangeThreshold: 4,
    });
  });

  it('should not show custom badge if global flapping is disabled and rule flapping is disabled', async () => {
    const onFlappingChangeMock = jest.fn();
    const disabledSpaceFlappingSettings = { ...spaceFlappingSettings, enabled: false };
    const result = render(
      <RuleSettingsFlappingForm
        spaceFlappingSettings={disabledSpaceFlappingSettings}
        canWriteFlappingSettingsUI={true}
        onFlappingChange={onFlappingChangeMock}
      />,
      { wrapper: TestProviders }
    );

    expect(
      result.getByTestId('rulesSettingsFlappingEnableSwitch').getAttribute('aria-checked')
    ).toBe('false');
    expect(result.queryByTestId('rulesSettingsFlappingCustomSwitch')).not.toBeInTheDocument();
    expect(result.queryByTestId('rulesSettingsFlappingCustomBadge')).not.toBeInTheDocument();
    expect(onFlappingChangeMock).not.toHaveBeenCalled();
  });

  it('should show custom badge and hide custom configuration switch form if global flapping is disabled and rule flapping is enabled', async () => {
    const disabledSpaceFlappingSettings = { ...spaceFlappingSettings, enabled: false };
    let flappingSettings = null;
    const onFlappingChangeMock = jest.fn((changes) => {
      flappingSettings = changes;
    });

    const result = render(
      <RuleSettingsFlappingForm
        flappingSettings={flappingSettings}
        spaceFlappingSettings={disabledSpaceFlappingSettings}
        canWriteFlappingSettingsUI={true}
        onFlappingChange={onFlappingChangeMock}
      />,
      { wrapper: TestProviders }
    );

    expect(
      result.getByTestId('rulesSettingsFlappingEnableSwitch').getAttribute('aria-checked')
    ).toBe('false');
    expect(result.queryByTestId('rulesSettingsFlappingCustomSwitch')).not.toBeInTheDocument();

    const customSwitch = screen.getByTestId('rulesSettingsFlappingEnableSwitch');
    fireEvent.click(customSwitch);

    result.rerender(
      <RuleSettingsFlappingForm
        flappingSettings={flappingSettings}
        spaceFlappingSettings={disabledSpaceFlappingSettings}
        canWriteFlappingSettingsUI={true}
        onFlappingChange={onFlappingChangeMock}
      />
    );

    expect(
      result.getByTestId('rulesSettingsFlappingEnableSwitch').getAttribute('aria-checked')
    ).toBe('true');
    expect(result.getByTestId('rulesSettingsFlappingCustomBadge')).toBeInTheDocument();
    expect(result.queryByTestId('rulesSettingsFlappingCustomSwitch')).not.toBeInTheDocument();
    expect(onFlappingChangeMock).toHaveBeenCalledWith({
      enabled: true,
      lookBackWindow: 20,
      statusChangeThreshold: 4,
    });
  });
});
