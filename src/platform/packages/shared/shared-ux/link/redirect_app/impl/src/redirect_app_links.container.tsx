/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import type { RedirectAppLinksComponentProps } from '@kbn/shared-ux-link-redirect-app-types';

import { useServices } from './services';
import { RedirectAppLinks as Component } from './redirect_app_links.component';

/**
 * A service-enabled component that provides Kibana-specific functionality to the `RedirectAppLinks`
 * pure component.
 *
 * @example
 * ```tsx
 * <RedirectAppLinks>
 *   <a href="/base-path/app/another-app/some-path">Go to another-app</a>
 * </RedirectAppLinks>
 * ```
 */
export const RedirectAppLinks: FC<Omit<RedirectAppLinksComponentProps, 'navigateToUrl'>> = ({
  children,
  ...props
}) => (
  <Component {...useServices()} {...props}>
    {children}
  </Component>
);
