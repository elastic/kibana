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
import { FontInfoCard } from './font_info_card';

describe('FontInfoCard', () => {
  let element: HTMLParagraphElement;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    element = document.createElement('p');
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      fontFamily: '"Inter", sans-serif',
      fontSize: '14px',
      fontWeight: '400',
      lineHeight: '20px',
      letterSpacing: 'normal',
      color: 'rgb(29, 42, 62)',
    } as CSSStyleDeclaration);
  });

  it('shows the full font stack and metric rows without section headings', () => {
    renderWithI18n(<FontInfoCard element={element} isPinned={false} />);

    expect(screen.getByText('"Inter", sans-serif')).toBeInTheDocument();
    expect(screen.queryByText('Typography')).not.toBeInTheDocument();
    expect(screen.queryByText('Colors')).not.toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('Line height')).toBeInTheDocument();
    expect(screen.getByText('Text color')).toBeInTheDocument();
    expect(screen.getByText('14px')).toBeInTheDocument();
    expect(screen.getByText('font.scale.s')).toBeInTheDocument();
    expect(screen.getByText('font.weight.regular')).toBeInTheDocument();
    expect(screen.getByText('#1d2a3e')).toBeInTheDocument();
  });
});
