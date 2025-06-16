/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { styledSVG } from './define';

describe('styledSVG', () => {
  it('is a function', () => {
    expect(styledSVG).toBeInstanceOf(Function);
  });

  it('returns a string', () => {
    const doc = styledSVG`
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <!-- Using g to inherit presentation attributes -->
        <g fill="white" stroke="green" stroke-width="5">
        <circle cx="40" cy="40" r="25" />
        <circle cx="60" cy="60" r="25" />
        </g>
    </svg>`;

    expect(doc).toEqual(expect.any(String));
  });
});
