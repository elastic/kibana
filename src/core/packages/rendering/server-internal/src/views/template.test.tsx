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
  it('renders <elastic-loader-ring> for the default splash', () => {
    const $ = render(baseMetadata);
    const ring = $('#kbn_loading_message .kbnLoaderWrap > elastic-loader-ring');
    expect(ring).toHaveLength(1);
    expect(ring.attr('size')).toBe('120');
    expect(ring.attr('mode')).toBe('sweep');
    expect(ring.attr('data-test-subj')).toBe('kbnLoadingElasticRing');
    expect($('#kbn_loading_message .kbnLoaderWrap > img')).toHaveLength(0);
  });

  it('loads the loader-ring script before bootstrap', () => {
    const $ = render(baseMetadata);
    const scripts = $('script[src]')
      .map((_, el) => $(el).attr('src'))
      .get();
    expect(scripts).toContain('/ui/loader_ring.js');
    expect(scripts.indexOf('/ui/loader_ring.js')).toBeLessThan(scripts.indexOf('/bootstrap.js'));
  });

  it('renders the custom-branded <img> inside .kbnLoaderWrap when configured', () => {
    const $ = render({
      ...baseMetadata,
      customBranding: { logo: 'https://example.test/custom.svg' },
    });
    expect($('#kbn_loading_message .kbnLoaderWrap > img')).toHaveLength(1);
    expect($('#kbn_loading_message .kbnLoaderWrap > elastic-loader-ring')).toHaveLength(0);
  });

  it('renders default and custom-branded splash logos at the same 120×120 box', () => {
    const $default = render(baseMetadata);
    const $custom = render({
      ...baseMetadata,
      customBranding: { logo: 'https://example.test/custom.svg' },
    });

    const ring = $default('#kbn_loading_message .kbnLoaderWrap > elastic-loader-ring');
    const customImg = $custom('#kbn_loading_message .kbnLoaderWrap > img');

    expect(ring.attr('size')).toBe('120');
    expect(customImg.attr('width')).toBe('120');
    expect(customImg.attr('height')).toBe('120');
  });

  it('omits the progress bar for the default ring splash', () => {
    const $ = render(baseMetadata);
    expect($('#kbn_loading_message .kbnProgress')).toHaveLength(0);
  });

  it('keeps the progress bar for custom-branded splash logos', () => {
    const $ = render({
      ...baseMetadata,
      customBranding: { logo: 'https://example.test/custom.svg' },
    });
    expect($('#kbn_loading_message .kbnProgress')).toHaveLength(1);
  });

  it('uses the static Logo SVG on the legacy browser error screen', () => {
    const $ = render(baseMetadata);
    expect($('#kbn_legacy_browser_error > svg.kbnLoader')).toHaveLength(1);
  });

  describe('splash color mode', () => {
    // Select only the inline splash <style> (the block that defines the loader
    // mark colour) rather than every <style> in the head.
    const getSplashCss = ($: ReturnType<typeof render>) =>
      $('head style')
        .filter((_i, el) => $(el).text().includes('--elastic-loader-ring-mark'))
        .text();

    it('inlines a single set of splash colors for an explicit dark mode', () => {
      const css = getSplashCss(render({ ...baseMetadata, darkMode: true }));
      expect(css).toContain('background-color: #07101F;'); // borealis dark page background
      expect(css).not.toContain('#ECF1F9'); // no light background
      expect(css).not.toContain('@media (prefers-color-scheme');
    });

    it('inlines both variants behind a media query for system mode so the splash has no flash', () => {
      const $ = render({ ...baseMetadata, darkMode: 'system' });
      const css = getSplashCss($);
      expect(css).toContain('background-color: #ECF1F9;');
      expect(css).toContain('@media (prefers-color-scheme: dark)');
      expect(css).toContain('background-color: #07101F;');
      expect($('head script[src*="bootstrap_system_theme"]')).toHaveLength(0);
    });

    it('uses the theme-specific palette for a non-borealis theme in system mode', () => {
      const $ = render({
        ...baseMetadata,
        darkMode: 'system',
        injectedMetadata: { theme: { name: 'amsterdam' } },
      } as unknown as RenderingMetadata);
      const css = getSplashCss($);
      expect(css).toContain('background-color: #F8FAFD;');
      expect(css).toContain('@media (prefers-color-scheme: dark)');
      expect(css).toContain('background-color: #141519;');
    });
  });
});
