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
 * Workflow pages are a proof of concept. `workflowsManagement.pages.enabled` is the
 * deployment-wide kill switch. The routes fail closed: while pages are off or no
 * encryption key is set, they are not mounted and no unauthenticated surface exists.
 */
export function registerPageRoutes(deps: RouteDependencies) {
  if (!deps.config?.pages?.enabled) {
    return;
  }
  if (!deps.canEncryptPages) {
    deps.logger.warn(
      'Workflow pages are enabled but xpack.encryptedSavedObjects.encryptionKey is not set. Pages stay offline.'
    );
    return;
  }

  registerPageFormRoute(deps);
  registerPageSubmitRoute(deps);
  registerPageLinkRoute(deps);
  registerPageRotateRoute(deps);
}
