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
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { GridOverlay, getDefaultGridConfig } from './grid_overlay';

describe('GridOverlay', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render the overlay container', () => {
    const config = getDefaultGridConfig(16);
    renderWithI18n(<GridOverlay config={config} />);

    expect(screen.getByTestId('gridOverlayContainer')).toBeInTheDocument();
  });

  it('should render the correct number of columns', () => {
    const config = { ...getDefaultGridConfig(16), columns: 6 };
    renderWithI18n(<GridOverlay config={config} />);

    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId(`gridColumn-${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('gridColumn-6')).not.toBeInTheDocument();
  });

  it('should render 12 columns by default', () => {
    const config = getDefaultGridConfig(16);
    renderWithI18n(<GridOverlay config={config} />);

    for (let i = 0; i < 12; i++) {
      expect(screen.getByTestId(`gridColumn-${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('gridColumn-12')).not.toBeInTheDocument();
  });
});

describe('getDefaultGridConfig', () => {
  it('should return correct defaults', () => {
    const config = getDefaultGridConfig(16);

    expect(config).toEqual({
      columns: 12,
      type: 'stretch',
      width: 0,
      gutterSize: 16,
      marginSize: 16,
      color: '#FF00FF1A',
    });
  });

  it('should use baseSize for gutter and margin', () => {
    const config = getDefaultGridConfig(24);

    expect(config.gutterSize).toBe(24);
    expect(config.marginSize).toBe(24);
  });
});
