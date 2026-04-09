/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Fonts } from './fonts';

describe('Fonts component', () => {
  it('includes font-display: swap when optimizeFontLoading is true', () => {
    const html = renderToStaticMarkup(<Fonts url="/ui" optimizeFontLoading={true} />);
    expect(html).toContain('font-display: swap');
  });

  it('does not include font-display: swap when optimizeFontLoading is false', () => {
    const html = renderToStaticMarkup(<Fonts url="/ui" optimizeFontLoading={false} />);
    expect(html).not.toContain('font-display: swap');
  });

  it('does not include font-display: swap when optimizeFontLoading is undefined', () => {
    const html = renderToStaticMarkup(<Fonts url="/ui" />);
    expect(html).not.toContain('font-display: swap');
  });

  it('renders Inter and Roboto Mono font-face declarations', () => {
    const html = renderToStaticMarkup(<Fonts url="/ui" />);
    expect(html).toContain("font-family: 'Inter'");
    expect(html).toContain("font-family: 'Roboto Mono'");
  });
});
