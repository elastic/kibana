/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import React from 'react';
import { getDataUrlFromReactComponent } from './icon_to_data_url';

const FALLBACK = 'fallback.svg';

const decode = (dataUrl: string) => {
  expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  return atob(dataUrl.replace('data:image/svg+xml;base64,', ''));
};

describe('getDataUrlFromReactComponent', () => {
  it('drops `fill="none"` and inherits `currentColor` when the root has no fill of its own', () => {
    // Without this the glyph paints nothing as a data URL — the `workflow.output`
    // regression, which rendered black on a dark canvas.
    const Glyph = () => (
      <svg viewBox="0 0 16 16" fill="none">
        <path fill="none" d="M0 0h16v16H0z" />
      </svg>
    );

    const svg = decode(getDataUrlFromReactComponent(Glyph, FALLBACK));

    expect(svg).not.toContain('fill="none"');
    expect(svg).toContain('fill="currentColor"');
  });

  it('leaves a root fill alone and preserves a child `fill="none"`', () => {
    // A stroked shape becomes a filled blob if its `none` is dropped, and a second
    // root `fill` is a fatal parse error in `image/svg+xml` — the browser drops the
    // icon with no warning.
    const Glyph = () => (
      <svg viewBox="0 0 16 16" fill="#181717">
        <path d="M0 0h16v16H0z" />
        <circle cx="8" cy="8" r="4" fill="none" stroke="#181717" />
      </svg>
    );

    const svg = decode(getDataUrlFromReactComponent(Glyph, FALLBACK));

    expect(svg).toContain('fill="none"');
    expect(svg).not.toContain('fill="currentColor"');
    const rootTag = svg.slice(0, svg.indexOf('>') + 1);
    expect(rootTag.match(/fill="/g)).toHaveLength(1);
    expect(rootTag).toContain('fill="#181717"');
  });

  it('returns the `src` of a component that renders an `<img>` rather than inlining it', () => {
    const Raster = () => <img src="data:image/png;base64,iVBORw0KGgo=" alt="" />;

    expect(getDataUrlFromReactComponent(Raster, FALLBACK)).toBe(
      'data:image/png;base64,iVBORw0KGgo='
    );
  });

  // The render happens outside the React tree, so without an explicit color mode a
  // brand icon's `useEuiTheme()` reads EUI's default context and bakes the light fill
  // into every URL — invisible against the dark editor canvas.
  it('renders the glyph against the requested color mode', () => {
    const BrandGlyph = () => {
      const { colorMode } = useEuiTheme();
      return <svg viewBox="0 0 16 16" fill={colorMode === 'DARK' ? '#FFFFFF' : '#181717'} />;
    };

    expect(decode(getDataUrlFromReactComponent(BrandGlyph, FALLBACK, 'DARK'))).toContain(
      'fill="#FFFFFF"'
    );
    expect(decode(getDataUrlFromReactComponent(BrandGlyph, FALLBACK, 'LIGHT'))).toContain(
      'fill="#181717"'
    );
    // Callers that aren't theme-aware keep the light rendering.
    expect(decode(getDataUrlFromReactComponent(BrandGlyph, FALLBACK))).toContain('fill="#181717"');
  });

  it('returns the fallback when the component throws', () => {
    const Broken = () => {
      throw new Error('render failed');
    };

    expect(getDataUrlFromReactComponent(Broken, FALLBACK)).toBe(FALLBACK);
  });
});
