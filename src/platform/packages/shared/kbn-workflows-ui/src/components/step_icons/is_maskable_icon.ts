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
 * True for the SVG-asset URLs `HardcodedIcons` resolves to, which callers paint
 * as a `mask-image` so the glyph picks up a theme tint instead of the fill baked
 * into the file.
 *
 * Both URL shapes have to match: `@kbn/optimizer` inlines assets under 8kb as
 * `data:` URLs, while Storybook emits every asset as a separate file. Matching
 * only `data:` left the built-in workflow glyphs as untintable `<img>` elements
 * — invisible on a dark canvas — in Storybook but not in Kibana.
 */
export const isMaskableIcon = (iconType: IconType): boolean =>
  typeof iconType === 'string' && (iconType.startsWith('data:') || SVG_URL.test(iconType));
