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
import { load } from 'cheerio';

import { Logo } from './logo';

const render = () => load(renderToStaticMarkup(<Logo />));

describe('Logo (boot splash)', () => {
  it('carries the .kbnLoader hook so legacy_styles.css can animate it', () => {
    // legacy_styles.css selects `.kbnLoaderWrap .kbnLoader path` to apply
    // the EuiLoadingElastic keyframes; this class must stay in sync.
    expect(render()('svg.kbnLoader')).toHaveLength(1);
  });

  it('renders the six logoElastic paths the keyframes target via nth-of-type', () => {
    // legacy_styles.css applies a staggered `animation-delay` to
    // `nth-of-type(1)`..`nth-of-type(6)`. Adding/removing a path here
    // would silently break the animation cadence.
    expect(render()('svg.kbnLoader > path')).toHaveLength(6);
  });

  it('is decorative; the loading announcement belongs to the wrapper', () => {
    // The `role="progressbar"` + aria-label live on `.kbnLoaderWrap` in
    // template.tsx (mirroring how <EuiLoadingElastic /> wraps its icon).
    expect(render()('svg').attr('aria-hidden')).toBe('true');
  });

  it('uses the modern logoElastic palette (matches @elastic/eui)', () => {
    const $ = render();
    const fills = $('svg > path')
      .map((_, el) => $(el).attr('fill'))
      .get();

    expect(fills).toEqual(['#0B64DD', '#9ADC30', '#1BA9F5', '#F04E98', '#02BCB7', '#FEC514']);
  });
});
