/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStyleProperty } from './get_style_property';

describe('getStyleProperty', () => {
  it('returns the numeric value for a CSS property', () => {
    const element = document.createElement('div');
    element.style.setProperty('gap', '12px');

    document.body.appendChild(element);

    expect(getStyleProperty(element, 'gap')).toBe(12);

    element.remove();
  });
});
