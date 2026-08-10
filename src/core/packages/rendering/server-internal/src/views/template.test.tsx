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

  describe('splash color mode', () => {
    // Select only the inline splash <style> (the block that defines the loader
    // colors, identified by `.kbnProgress`) rather than every <style> in the
    // head, so the assertions validate the splash rules specifically.
    const getSplashCss = ($: ReturnType<typeof render>) =>
      $('head style')
        .filter((_i, el) => $(el).text().includes('.kbnProgress'))
        .text();

    it('inlines a single set of splash colors for an explicit dark mode', () => {
      const css = getSplashCss(render({ ...baseMetadata, darkMode: true }));
      expect(css).toContain('background-color: #07101F;'); // borealis dark page background
      expect(css).not.toContain('#F6F9FC'); // no light background
      expect(css).not.toContain('@media (prefers-color-scheme');
    });

    it('inlines both variants behind a media query for system mode so the splash has no flash', () => {
      const $ = render({ ...baseMetadata, darkMode: 'system' });
      const css = getSplashCss($);
      // light defaults applied at first paint, dark applied via the CSS engine (no JS, no flash)
      expect(css).toContain('background-color: #F6F9FC;'); // light default page background
      expect(css).toContain('@media (prefers-color-scheme: dark)');
      expect(css).toContain('background-color: #07101F;'); // dark override page background
      // the old JS-based system theme bootstrap must no longer be injected
      expect($('head script[src*="bootstrap_system_theme"]')).toHaveLength(0);
    });

    it('uses the theme-specific palette for a non-borealis theme in system mode', () => {
      // The old bootstrap script was hard-coded to the borealis palette regardless
      // of theme; resolving colors from `getThemeStyles(themeName)` means a
      // non-borealis theme now gets its own splash colors.
      const $ = render({
        ...baseMetadata,
        darkMode: 'system',
        injectedMetadata: { theme: { name: 'amsterdam' } },
      } as unknown as RenderingMetadata);
      const css = getSplashCss($);
      expect(css).toContain('background-color: #F8FAFD;'); // amsterdam light default
      expect(css).toContain('@media (prefers-color-scheme: dark)');
      expect(css).toContain('background-color: #141519;'); // amsterdam dark override
    });
  });
});
