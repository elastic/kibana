/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildFlavor } from '@kbn/config';
import type { CspAdditionalConfig } from './config';

/**
 * Enforced CSP directives that depend on the build flavor.
 *
 * Serverless configures these directives itself, so it receives nothing here. Traditional
 * builds enforce the directives below. Their values append to the defaults in `csp_directives.ts`
 * and to anything set through the matching `csp.*` settings.
 *
 * - `img-src`: image sources are mostly deployment specific (custom logos, authentication provider
 *   icons, tile servers), so any network origin is allowed rather than requiring every deployment
 *   to configure its own list. `blob:` covers the Maps legend icons.
 * - `font-src`: Kibana ships its own fonts and inlines the small ones as data URIs.
 * - `media-src`: Kibana has no media source other than itself and the Elastic CDN.
 *
 * @internal
 */
export const getBuildFlavorCspConfig = (buildFlavor: BuildFlavor): CspAdditionalConfig => {
  if (buildFlavor === 'serverless') {
    return {};
  }
  return {
    font_src: ['data:'],
    img_src: ['data:', 'blob:', 'https:', 'http:'],
    media_src: [`'self'`, 'kibana.estccdn.com'],
  };
};
