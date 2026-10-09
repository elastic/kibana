/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';

const SVG_URL = /\.svg(\?|$)/;

/**
 * The URL to paint as a `mask-image` for the SVG assets `HardcodedIcons` resolves
 * to, so the glyph picks up a theme tint instead of the fill baked into the file.
 * Returns `undefined` for anything else — EUI icon names, `token*`, components.
 *
 * Both URL shapes have to match: `@kbn/optimizer` inlines assets under 8kb as
 * `data:` URLs, while other bundlers emit them as separate files. Matching only
 * `data:` left the built-in workflow glyphs as untintable `<img>` elements —
 * invisible on a dark canvas — wherever assets weren't inlined.
 */
export const getMaskableIconUrl = (iconType: IconType): string | undefined =>
  typeof iconType === 'string' && (iconType.startsWith('data:') || SVG_URL.test(iconType))
    ? iconType
    : undefined;
