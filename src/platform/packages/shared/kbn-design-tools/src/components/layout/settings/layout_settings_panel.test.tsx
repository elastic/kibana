/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { LayoutSettingsPanel } from './layout_settings_panel';
import { getDefaultLayoutConfig } from '../../../lib/layout/layout_config';
import type { LayoutConfig } from '../../../lib/layout/layout_config';

describe('LayoutSettingsPanel', () => {
  const defaultConfig = getDefaultLayoutConfig(16);
  let config: LayoutConfig;
  let setConfig: jest.Mock;

  beforeEach(() => {
    config = { ...defaultConfig };
    setConfig = jest.fn();
  });

  it('should render all form fields for columns layout', () => {
    renderWithI18n(
      <LayoutSettingsPanel config={config} defaultConfig={defaultConfig} setConfig={setConfig} />
    );

    expect(screen.getByTestId('layoutSettingsLayoutType')).toBeInTheDocument();
    expect(screen.getByTestId('layoutSettingsCount')).toBeInTheDocument();
    expect(screen.getByTestId('layoutSettingsAlign')).toBeInTheDocument();
    expect(screen.getByTestId('layoutSettingsGutter')).toBeInTheDocument();
    expect(screen.getByTestId('layoutSettingsMargin')).toBeInTheDocument();
    expect(screen.getByTestId('layoutSettingsColor')).toBeInTheDocument();
  });

  it('should display current count value', () => {
    renderWithI18n(
      <LayoutSettingsPanel
        config={{ ...config, count: 8 }}
        defaultConfig={defaultConfig}
        setConfig={setConfig}
      />
    );

    const countInput = screen.getByDisplayValue('8');
    expect(countInput).toBeInTheDocument();
  });

  it('should call setConfig when count changes', async () => {
    renderWithI18n(
      <LayoutSettingsPanel config={config} defaultConfig={defaultConfig} setConfig={setConfig} />
    );

    const countInput = screen.getByDisplayValue('12');
    await userEvent.clear(countInput);
    await userEvent.type(countInput, '6');

    expect(setConfig).toHaveBeenCalled();
  });

  it('should show Width field only when columns layout with non-stretch align', () => {
    renderWithI18n(
      <LayoutSettingsPanel
        config={{ ...config, layoutType: 'columns', alignType: 'center' }}
        defaultConfig={defaultConfig}
        setConfig={setConfig}
      />
    );

    expect(screen.getByTestId('layoutSettingsWidth')).toBeInTheDocument();
  });

  it('should hide Width field when columns layout with stretch align', () => {
    renderWithI18n(
      <LayoutSettingsPanel
        config={{ ...config, layoutType: 'columns', alignType: 'stretch' }}
        defaultConfig={defaultConfig}
        setConfig={setConfig}
      />
    );

    expect(screen.queryByTestId('layoutSettingsWidth')).not.toBeInTheDocument();
  });

  it('should show Size field for grid layout and hide count/align/gutter/margin', () => {
    renderWithI18n(
      <LayoutSettingsPanel
        config={{ ...config, layoutType: 'grid' }}
        defaultConfig={defaultConfig}
        setConfig={setConfig}
      />
    );

    expect(screen.getByTestId('layoutSettingsCellSize')).toBeInTheDocument();
    expect(screen.queryByTestId('layoutSettingsCount')).not.toBeInTheDocument();
    expect(screen.queryByTestId('layoutSettingsAlign')).not.toBeInTheDocument();
    expect(screen.queryByTestId('layoutSettingsGutter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('layoutSettingsMargin')).not.toBeInTheDocument();
  });

  it('should show Height field for rows layout with non-stretch align', () => {
    renderWithI18n(
      <LayoutSettingsPanel
        config={{ ...config, layoutType: 'rows', rowAlignType: 'center' }}
        defaultConfig={defaultConfig}
        setConfig={setConfig}
      />
    );

    expect(screen.getByTestId('layoutSettingsHeight')).toBeInTheDocument();
    expect(screen.queryByTestId('layoutSettingsWidth')).not.toBeInTheDocument();
  });
});
