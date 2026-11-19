/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFontInfo } from './get_font_info';

describe('getFontInfo', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('p');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockComputedStyle = (styles: {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
  }) => {
    jest.spyOn(window, 'getComputedStyle').mockReturnValue(styles as CSSStyleDeclaration);
  };

  it('should return computed font properties', () => {
    mockComputedStyle({
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '16px',
      fontWeight: '400',
      lineHeight: '24px',
      letterSpacing: 'normal',
    });

    expect(getFontInfo(element)).toEqual({
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '16px',
      fontWeight: '400',
      lineHeight: '24px',
      letterSpacing: 'normal',
    });
  });

  it('should round fractional pixel values in size and line-height, but not letter-spacing', () => {
    mockComputedStyle({
      fontFamily: 'Arial',
      fontSize: '14.567px',
      fontWeight: '400',
      lineHeight: '20.49px',
      letterSpacing: '0.4px',
    });

    expect(getFontInfo(element)).toMatchObject({
      fontSize: '15px',
      lineHeight: '20px',
      letterSpacing: '0.4px',
    });
  });
});
