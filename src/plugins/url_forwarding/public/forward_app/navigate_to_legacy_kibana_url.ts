/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ApplicationStart, IBasePath } from 'kibana/public';
import { ForwardDefinition } from '../index';
import { normalizePath } from './normalize_path';

export const navigateToLegacyKibanaUrl = (
  path: string,
  forwards: ForwardDefinition[],
  basePath: IBasePath,
  application: ApplicationStart
): { navigated: boolean } => {
  const normalizedPath = normalizePath(path);

  // try to find an existing redirect for the target path if possible
  // this avoids having to load the legacy app just to get redirected to a core application again afterwards
  const relevantForward = forwards.find((forward) =>
    normalizedPath.startsWith(`/${forward.legacyAppId}`)
  );
  if (!relevantForward) {
    return { navigated: false };
  }
  const targetAppPath = relevantForward.rewritePath(normalizedPath);
  const targetAppId = relevantForward.newAppId;
  application.navigateToApp(targetAppId, { path: targetAppPath, replace: true });
  return { navigated: true };
};
