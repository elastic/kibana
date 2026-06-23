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
import { load, type CheerioAPI } from 'cheerio';

import { icon as EuiLogoElasticIcon } from '@elastic/eui/test-env/components/icon/assets/logo_elastic';

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

  // Drift guard: rather than hard-coding the palette, compare our inlined
  // SSR copy of the logo against the actual `logoElastic` asset shipped
  // by `@elastic/eui` (the same one `<EuiLoadingElastic />` uses under
  // the hood, see node_modules/@elastic/eui/es/components/icon/assets/
  // logo_elastic.js). If EUI rebrands the logo, this test fails and the
  // next person knows to re-copy the SVG paths into logo.tsx.
  it('stays byte-for-byte in sync with @elastic/eui logoElastic', () => {
    const collect = ($: CheerioAPI) =>
      $('path')
        .map((_, el) => ({
          fill: $(el).attr('fill'),
          stroke: $(el).attr('stroke'),
          'stroke-width': $(el).attr('stroke-width'),
          d: $(el).attr('d'),
        }))
        .get();

    const ours = render();
    const eui = load(renderToStaticMarkup(<EuiLogoElasticIcon />));

    expect(collect(ours)).toEqual(collect(eui));
  });
});
