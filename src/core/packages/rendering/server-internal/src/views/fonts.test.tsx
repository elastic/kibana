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

import { Fonts } from './fonts';

const TEST_URL = '/test-base-path';

const getRenderedCss = (optimizeFontLoading?: boolean) => {
  const markup = renderToStaticMarkup(
    optimizeFontLoading === undefined ? (
      <Fonts url={TEST_URL} />
    ) : (
      <Fonts url={TEST_URL} optimizeFontLoading={optimizeFontLoading} />
    )
  );
  const dom = load(markup);

  return dom('style').html() ?? '';
};

const getFontFaceBlock = ({
  family,
  style,
  weight,
  optimizeFontLoading,
}: {
  family: string;
  style: 'normal' | 'italic';
  weight: string | number;
  optimizeFontLoading?: boolean;
}) => {
  const blocks = getRenderedCss(optimizeFontLoading).match(/@font-face\s*{[\s\S]*?}/g) ?? [];
  const block = blocks.find(
    (candidate) =>
      candidate.includes(`font-family: '${family}';`) &&
      candidate.includes(`font-style: ${style};`) &&
      candidate.includes(`font-weight: ${weight};`)
  );

  expect(block).toBeDefined();

  return block!;
};

describe('Fonts', () => {
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

  it('renders Inter, Roboto Mono, and Elastic UI Numeric font-face declarations', () => {
    const html = renderToStaticMarkup(<Fonts url="/ui" />);
    expect(html).toContain("font-family: 'Inter'");
    expect(html).toContain("font-family: 'Roboto Mono'");
    expect(html).toContain("font-family: 'Elastic UI Numeric'");
  });

  it('renders optional font-face declarations when configured', () => {
    expect(
      getFontFaceBlock({
        family: 'Elastic UI Numeric',
        style: 'normal',
        weight: '100 900',
        optimizeFontLoading: true,
      })
    ).toMatchInlineSnapshot(`
"@font-face {
          font-family: 'Elastic UI Numeric';
          font-style: normal;
          font-weight: 100 900;
          font-display: swap;
          src: url('/test-base-path/fonts/elastic_ui_numeric/ElasticUINumeric-Variable.woff2') format('woff2');
          unicode-range: U+20, U+24-25, U+28-29, U+2B-2F, U+30-3A, U+A0, U+202F, U+2212;
        }"
`);
  });

  it('omits optional font-face declarations when they are not configured', () => {
    expect(
      getFontFaceBlock({
        family: 'Inter',
        style: 'normal',
        weight: 100,
        optimizeFontLoading: false,
      })
    ).toMatchInlineSnapshot(`
"@font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 100;
          src: url('/test-base-path/fonts/inter/Inter-Thin.woff2') format('woff2');
        }"
`);
  });

  it('renders unicode-range without font-display when only unicode range is configured', () => {
    expect(
      getFontFaceBlock({
        family: 'Roboto Mono',
        style: 'normal',
        weight: 400,
        optimizeFontLoading: false,
      })
    ).toMatchInlineSnapshot(`
"@font-face {
          font-family: 'Roboto Mono';
          font-style: normal;
          font-weight: 400;
          src: local('Roboto Mono'), local('RobotoMono-Regular'), url('/test-base-path/fonts/roboto_mono/RobotoMono-Regular.ttf') format('woff2');
          unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
        }"
`);
  });
});
