/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useDesignTokenSections } from './use_design_token_sections';

describe('useDesignTokenSections', () => {
  let element: HTMLElement;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockComputedStyle = (styles: Partial<CSSStyleDeclaration>) => {
    jest.spyOn(window, 'getComputedStyle').mockReturnValue(styles as CSSStyleDeclaration);
  };

  beforeEach(() => {
    element = document.createElement('p');
  });

  it('returns the full font stack and a flat list of token rows', () => {
    mockComputedStyle({
      fontFamily: '"Inter", sans-serif',
      fontSize: '14px',
      fontWeight: '400',
      lineHeight: '20px',
      letterSpacing: 'normal',
      color: 'rgb(29, 42, 62)',
    });

    const { result } = renderHook(() => useDesignTokenSections(element));

    expect(result.current.fontFamily).toBe('"Inter", sans-serif');
    expect(result.current.rows.find((row) => row.label === 'Size')?.cssProperty).toBe('font-size');
    expect(result.current.rows.find((row) => row.label === 'Size')?.token).toBe('font.scale.s');
    expect(result.current.rows.find((row) => row.label === 'Weight')?.cssProperty).toBe(
      'font-weight'
    );
    expect(result.current.rows.find((row) => row.label === 'Weight')?.token).toBe(
      'font.weight.regular'
    );
    expect(result.current.rows.find((row) => row.label === 'Line height')?.cssProperty).toBe(
      'line-height'
    );
    const textColor = result.current.rows.find((row) => row.label === 'Text color');
    expect(textColor?.cssProperty).toBe('color');
    expect(textColor?.value).toBe('#1d2a3e');
    expect(textColor?.swatchColor).toBe('#1d2a3e');
    expect(result.current.rows.map((row) => row.label)).toEqual([
      'Size',
      'Weight',
      'Line height',
      'Text color',
    ]);
  });

  it('includes letter spacing row with cssProperty when spacing is non-default', () => {
    mockComputedStyle({
      fontFamily: '"Inter", sans-serif',
      fontSize: '14px',
      fontWeight: '400',
      lineHeight: '20px',
      letterSpacing: '0.5px',
      color: 'rgb(29, 42, 62)',
    });

    const { result } = renderHook(() => useDesignTokenSections(element));

    expect(
      result.current.rows.find((row) => row.label === 'Letter spacing')?.cssProperty
    ).toBe('letter-spacing');
  });
});
