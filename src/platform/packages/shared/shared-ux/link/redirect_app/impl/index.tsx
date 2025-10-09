/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren } from 'react';
export { RedirectAppLinks } from './src/deprecated_redirect_app_links.component';
export { RedirectAppLinks as RedirectAppLinksContainer } from './src/deprecated_redirect_app_links.component';
export { RedirectAppLinks as RedirectAppLinksComponent } from './src/deprecated_redirect_app_links.component';

/**
 * @deprecated - does nothing. This provider is no longer needed as the link navigation is handled by GlobalRedirectAppLinks component at the root of the application.
 */
export const RedirectAppLinksKibanaProvider = ({ children }: PropsWithChildren) => children;
