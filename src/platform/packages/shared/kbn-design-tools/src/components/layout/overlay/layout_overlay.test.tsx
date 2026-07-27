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
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { LayoutOverlay } from './layout_overlay';
import { getDefaultLayoutConfig } from '../../../lib/layout/layout_config';

describe('LayoutOverlay', () => {
  it('should render the overlay container', () => {
    const config = getDefaultLayoutConfig(16);
    renderWithI18n(<LayoutOverlay layoutConfig={config} />);

    expect(screen.getByTestId('layoutOverlayContainer')).toBeInTheDocument();
  });

  it('should render the correct number of columns', () => {
    const config = { ...getDefaultLayoutConfig(16), count: 6 };
    renderWithI18n(<LayoutOverlay layoutConfig={config} />);

    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId(`gridColumn-${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('gridColumn-6')).not.toBeInTheDocument();
  });

  it('should render 12 columns by default', () => {
    const config = getDefaultLayoutConfig(16);
    renderWithI18n(<LayoutOverlay layoutConfig={config} />);

    for (let i = 0; i < 12; i++) {
      expect(screen.getByTestId(`gridColumn-${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('gridColumn-12')).not.toBeInTheDocument();
  });

  it('should render rows when layoutType is rows', () => {
    const config = { ...getDefaultLayoutConfig(16), layoutType: 'rows' as const, count: 4 };
    renderWithI18n(<LayoutOverlay layoutConfig={config} />);

    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`gridRow-${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('gridRow-4')).not.toBeInTheDocument();
  });

  it('should render grid pattern when layoutType is grid', () => {
    const config = { ...getDefaultLayoutConfig(16), layoutType: 'grid' as const, cellSize: 100 };
    renderWithI18n(<LayoutOverlay layoutConfig={config} />);

    // Uses a single CSS background pattern div instead of individual cells
    expect(screen.getByTestId('gridPattern')).toBeInTheDocument();
    expect(screen.queryByTestId('gridColumn-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gridRow-0')).not.toBeInTheDocument();
  });
});

describe('getDefaultLayoutConfig', () => {
  it('should return correct defaults', () => {
    const config = getDefaultLayoutConfig(16);

    expect(config).toEqual({
      layoutType: 'columns',
      count: 12,
      alignType: 'stretch',
      rowAlignType: 'stretch',
      cellSize: 16,
      width: 0,
      height: 0,
      gutterSize: 16,
      marginSize: 16,
      color: '#FF00FF1A',
    });
  });

  it('should use baseSize for gutter and margin', () => {
    const config = getDefaultLayoutConfig(24);

    expect(config.gutterSize).toBe(24);
    expect(config.marginSize).toBe(24);
  });
});
