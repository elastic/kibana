/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { RedirectAppLinks as RedirectAppLinksContainer } from './redirect_app_links.container';
export { RedirectAppLinks as RedirectAppLinksComponent } from './redirect_app_links.component';
export { RedirectAppLinks } from './redirect_app_links';
export { RedirectAppLinksKibanaProvider, RedirectAppLinksProvider } from './services';

export type {
  RedirectAppLinksServices,
  RedirectAppLinksKibanaDependencies,
  RedirectAppLinksProps,
} from '@kbn/shared-ux-link-redirect-app-types';
