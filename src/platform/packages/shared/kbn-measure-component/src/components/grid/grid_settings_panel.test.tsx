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
import { getDefaultGridConfig } from '../../lib/grid';
import type { GridConfig } from '../../lib/grid';

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

  it('should render all form fields for columns layout', () => {
    renderWithI18n(
      <GridSettingsPanel config={config} defaultConfig={defaultConfig} setConfig={setConfig} />
    );

    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();
    expect(screen.getByText('Align')).toBeInTheDocument();
    expect(screen.getByText('Gutter')).toBeInTheDocument();
    expect(screen.getByText('Margin')).toBeInTheDocument();
    expect(screen.getByText('Color')).toBeInTheDocument();
  });

  it('should display current count value', () => {
    renderWithI18n(
      <GridSettingsPanel
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
      <GridSettingsPanel config={config} defaultConfig={defaultConfig} setConfig={setConfig} />
    );

    const countInput = screen.getByDisplayValue('12');
    await userEvent.clear(countInput);
    await userEvent.type(countInput, '6');

    expect(setConfig).toHaveBeenCalled();
  });

  it('should show Width field only when columns layout with non-stretch align', () => {
    renderWithI18n(
      <GridSettingsPanel
        config={{ ...config, layoutType: 'columns', alignType: 'center' }}
        defaultConfig={defaultConfig}
        setConfig={setConfig}
      />
    );

    expect(screen.getByText('Width')).toBeInTheDocument();
  });

  it('should hide Width field when columns layout with stretch align', () => {
    renderWithI18n(
      <GridSettingsPanel
        config={{ ...config, layoutType: 'columns', alignType: 'stretch' }}
        defaultConfig={defaultConfig}
        setConfig={setConfig}
      />
    );

    expect(screen.queryByText('Width')).not.toBeInTheDocument();
  });

  it('should show Size field for grid layout and hide count/align/gutter/margin', () => {
    renderWithI18n(
      <GridSettingsPanel
        config={{ ...config, layoutType: 'grid' }}
        defaultConfig={defaultConfig}
        setConfig={setConfig}
      />
    );

    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.queryByText('Count')).not.toBeInTheDocument();
    expect(screen.queryByText('Align')).not.toBeInTheDocument();
    expect(screen.queryByText('Gutter')).not.toBeInTheDocument();
    expect(screen.queryByText('Margin')).not.toBeInTheDocument();
  });

  it('should show Height field for rows layout with non-stretch align', () => {
    renderWithI18n(
      <GridSettingsPanel
        config={{ ...config, layoutType: 'rows', rowAlignType: 'center' }}
        defaultConfig={defaultConfig}
        setConfig={setConfig}
      />
    );

    expect(screen.getByText('Height')).toBeInTheDocument();
    expect(screen.queryByText('Width')).not.toBeInTheDocument();
  });
});
