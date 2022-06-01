/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { useServices } from './services';
import {
  RedirectAppLinks as Component,
  Props as ComponentProps,
} from './redirect_app_links.component';

type Props = Omit<ComponentProps, 'navigateToUrl' | 'currentAppId'>;

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
export const RedirectAppLinks = (props: Props) => <Component {...useServices()} {...props} />;
