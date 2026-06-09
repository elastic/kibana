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
    // legacy_styles.css selects `.kbnLoaderWrap .kbnLoader > g` to apply
    // the kbnLoadingElastic keyframes; this class must stay in sync.
    expect(render()('svg.kbnLoader')).toHaveLength(1);
  });

  it('renders six top-level <g> groups the keyframes target via nth-of-type', () => {
    // legacy_styles.css applies a staggered `animation-delay` to
    // `> g:nth-of-type(1)`..`> g:nth-of-type(6)`. Adding/removing a
    // group here would silently break the animation cadence.
    expect(render()('svg.kbnLoader > g')).toHaveLength(6);
  });

  it('is decorative; the loading announcement belongs to the wrapper', () => {
    // The `role="progressbar"` + aria-label live on `.kbnLoaderWrap` in
    // template.tsx (mirroring how <EuiLoadingElastic /> wraps its icon).
    expect(render()('svg').attr('aria-hidden')).toBe('true');
  });

  it('contains clip-path defs for the heart shape', () => {
    const $ = render();
    // Cheerio in default (HTML) mode lowercases tag names, so we check
    // the raw defs innerHTML for the SVG clipPath elements instead.
    const defsHtml = $('defs').html() ?? '';
    const clipPathCount = (defsHtml.match(/<clipPath/g) || []).length;
    expect(clipPathCount).toBeGreaterThanOrEqual(6);
  });
});
