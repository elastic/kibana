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

import { Logo, LOADING_ELASTIC_RING_MARK_PATH } from './logo';

const render = () => load(renderToStaticMarkup(<Logo />));

describe('Logo (static loader ring)', () => {
  it('renders a 120×120 loader-ring SVG', () => {
    const $ = render();
    expect($('svg.kbnLoader')).toHaveLength(1);
    expect($('svg.kbnLoader').attr('viewBox')).toBe('0 0 120 120');
    expect($('svg.kbnLoader').attr('width')).toBe('120');
  });

  it('renders the five ring segments from the static design', () => {
    expect(render()('svg.kbnLoader > circle')).toHaveLength(5);
  });

  it('renders the centre mark path', () => {
    const $ = render();
    expect($('svg.kbnLoader > path.kbnLoaderMark')).toHaveLength(1);
    expect($('path.kbnLoaderMark').attr('d')).toBe(LOADING_ELASTIC_RING_MARK_PATH);
  });

  it('is decorative', () => {
    expect(render()('svg').attr('aria-hidden')).toBe('true');
  });
});
