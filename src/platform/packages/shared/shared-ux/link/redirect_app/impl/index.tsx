/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { RedirectAppLinks as RedirectAppLinksContainer } from './src/redirect_app_links.container';
export { RedirectAppLinks as RedirectAppLinksComponent } from './src/redirect_app_links.component';
export { RedirectAppLinks } from './src/redirect_app_links';
export { RedirectAppLinksKibanaProvider, RedirectAppLinksProvider } from './src/services';

export type {
  RedirectAppLinksServices,
  RedirectAppLinksKibanaDependencies,
  RedirectAppLinksProps,
} from '@kbn/shared-ux-link-redirect-app-types';
