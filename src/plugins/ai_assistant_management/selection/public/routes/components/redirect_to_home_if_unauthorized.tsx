/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode } from 'react';
import type { CoreStart } from '@kbn/core/public';
export function RedirectToHomeIfUnauthorized({
  coreStart,
  children,
}: {
  coreStart: CoreStart;
  children: ReactNode;
}) {
  const {
    application: { capabilities, navigateToApp },
  } = coreStart;

  const allowed = capabilities?.management ?? false;

  if (!allowed) {
    navigateToApp('home');
    return null;
  }

  return <>{children}</>;
}
