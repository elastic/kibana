/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  registerPageFormRoute,
  registerPageLinkRoute,
  registerPageRotateRoute,
  registerPageSubmitRoute,
} from './page_routes';
import type { RouteDependencies } from '../types';

/**
 * Workflow pages are a proof of concept. They stay unmounted unless an operator
 * enables them and supplies both a signing key and a run identity, so no
 * unauthenticated surface appears by default.
 */
export function registerPageRoutes(deps: RouteDependencies) {
  const pages = deps.config?.pages;
  if (!pages?.enabled || !pages.signingKey || !pages.runAsApiKey) {
    return;
  }

  registerPageFormRoute(deps, pages.signingKey);
  registerPageSubmitRoute(deps, pages.signingKey, pages.runAsApiKey);
  registerPageLinkRoute(deps, pages.signingKey);
  registerPageRotateRoute(deps, pages.signingKey);
}
