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

import { Template } from './template';
import type { RenderingMetadata } from '../types';

const baseMetadata = {
  hardenPrototypes: false,
  strictCsp: false,
  uiPublicUrl: '/ui',
  bootstrapScriptUrl: '/bootstrap.js',
  locale: 'en',
  themeVersion: 'v9',
  darkMode: false,
  stylesheetPaths: [],
  scriptPaths: [],
  injectedMetadata: { theme: { name: 'borealis' } },
  customBranding: {},
} as unknown as RenderingMetadata;

const render = (metadata: RenderingMetadata) =>
  load(renderToStaticMarkup(<Template metadata={metadata} />));

describe('Template (boot splash)', () => {
  it('renders the default Logo SVG inside .kbnLoaderWrap', () => {
    const $ = render(baseMetadata);
    expect($('#kbn_loading_message .kbnLoaderWrap > svg.kbnLoader')).toHaveLength(1);
    expect($('#kbn_loading_message .kbnLoaderWrap > img')).toHaveLength(0);
  });

  it('renders the custom-branded <img> inside .kbnLoaderWrap when configured', () => {
    const $ = render({
      ...baseMetadata,
      customBranding: { logo: 'https://example.test/custom.svg' },
    });
    expect($('#kbn_loading_message .kbnLoaderWrap > img')).toHaveLength(1);
    expect($('#kbn_loading_message .kbnLoaderWrap > svg')).toHaveLength(0);
  });

  // Regression test for the inconsistency flagged in
  // https://github.com/elastic/kibana/pull/272444#discussion (gsoldevila):
  // before this fix the custom-branding <img> was hard-coded to 64×64
  // while the default Logo had shrunk to 40×40, so the two splash
  // variants rendered at different sizes. Both must now match
  // <EuiLoadingElastic size="xxl"> (40px on Borealis base) — enforced
  // here on the inline attrs *and* in legacy_styles.css via a single
  // `.kbnLoaderWrap > svg, .kbnLoaderWrap > img` rule.
  it('renders default and custom-branded splash logos at the same 40×40 box', () => {
    const $default = render(baseMetadata);
    const $custom = render({
      ...baseMetadata,
      customBranding: { logo: 'https://example.test/custom.svg' },
    });

    const defaultSvg = $default('#kbn_loading_message .kbnLoaderWrap > svg');
    const customImg = $custom('#kbn_loading_message .kbnLoaderWrap > img');

    expect(defaultSvg.attr('width')).toBe('32'); // SVG viewBox is 32; CSS scales it.
    expect(defaultSvg.attr('viewBox')).toBe('0 0 32 32');
    expect(customImg.attr('width')).toBe('40');
    expect(customImg.attr('height')).toBe('40');
  });

  it('wraps the loader with role="progressbar" so it matches <EuiLoadingElastic />', () => {
    const $ = render(baseMetadata);
    const wrap = $('#kbn_loading_message .kbnLoaderWrap');
    expect(wrap.attr('role')).toBe('progressbar');
    expect(wrap.attr('aria-label')).toBe('Loading Elastic');
  });
});
