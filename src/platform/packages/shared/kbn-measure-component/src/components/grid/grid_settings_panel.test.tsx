/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { GridSettingsPanel } from './grid_settings_panel';
import { getDefaultGridConfig } from './grid_overlay';
import type { GridConfig } from './grid_overlay';

describe('GridSettingsPanel', () => {
  const defaultConfig = getDefaultGridConfig(16);
  let config: GridConfig;
  let setConfig: jest.Mock;

  beforeEach(() => {
    config = { ...defaultConfig };
    setConfig = jest.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render all form fields', () => {
    renderWithI18n(
      <GridSettingsPanel config={config} defaultConfig={defaultConfig} setConfig={setConfig} />
    );

    expect(screen.getByText('Column count')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Gutter')).toBeInTheDocument();
    expect(screen.getByText('Margin')).toBeInTheDocument();
    expect(screen.getByText('Color')).toBeInTheDocument();
  });

  it('should display current column value', () => {
    renderWithI18n(
      <GridSettingsPanel
        config={{ ...config, columns: 8 }}
        defaultConfig={defaultConfig}
        setConfig={setConfig}
      />
    );

    const columnsInput = screen.getByDisplayValue('8');
    expect(columnsInput).toBeInTheDocument();
  });

  it('should call setConfig when columns change', async () => {
    renderWithI18n(
      <GridSettingsPanel config={config} defaultConfig={defaultConfig} setConfig={setConfig} />
    );

    const columnsInput = screen.getByDisplayValue('12');
    await userEvent.clear(columnsInput);
    await userEvent.type(columnsInput, '6');

    expect(setConfig).toHaveBeenCalled();
  });

  it('should show Width field only when type is not stretch', () => {
    renderWithI18n(
      <GridSettingsPanel
        config={{ ...config, type: 'center' }}
        defaultConfig={defaultConfig}
        setConfig={setConfig}
      />
    );

    expect(screen.getByText('Column width')).toBeInTheDocument();
  });

  it('should hide Width field when type is stretch', () => {
    renderWithI18n(
      <GridSettingsPanel
        config={{ ...config, type: 'stretch' }}
        defaultConfig={defaultConfig}
        setConfig={setConfig}
      />
    );

    expect(screen.queryByText('Width')).not.toBeInTheDocument();
  });
});
