/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { getMaskableIconUrl } from './get_maskable_icon_url';

describe('getMaskableIconUrl', () => {
  it('returns inlined `data:` URLs', () => {
    const dataUrl = 'data:image/svg+xml;base64,PHN2Zy8+';
    expect(getMaskableIconUrl(dataUrl)).toBe(dataUrl);
  });

  // The regression this guards: `@kbn/optimizer` inlines assets under 8kb, but
  // other bundlers emit them as files. Matching only `data:` left the built-in
  // glyphs as untintable `<img>` elements — invisible on a dark canvas.
  it('returns emitted `.svg` file URLs, with or without a cache-busting query', () => {
    expect(getMaskableIconUrl('/plugins/workflows/assets/execute.svg')).toBe(
      '/plugins/workflows/assets/execute.svg'
    );
    expect(getMaskableIconUrl('execute.svg?hash=8f2c1a')).toBe('execute.svg?hash=8f2c1a');
  });

  it('returns undefined for EUI icon names', () => {
    expect(getMaskableIconUrl('logoGithub')).toBeUndefined();
    expect(getMaskableIconUrl('tokenObject')).toBeUndefined();
  });

  // `.svg` has to be the extension, not just somewhere in the string, so an EUI
  // name or a path that merely contains those letters isn't repainted.
  it('returns undefined when `.svg` is not the extension', () => {
    expect(getMaskableIconUrl('/assets/svg-sprite/icons.png')).toBeUndefined();
    expect(getMaskableIconUrl('foo.svgz')).toBeUndefined();
  });

  it('returns undefined for component icons', () => {
    const Glyph = () => null;
    expect(getMaskableIconUrl(Glyph)).toBeUndefined();
    expect(getMaskableIconUrl(React.lazy(async () => ({ default: Glyph })))).toBeUndefined();
  });
});
