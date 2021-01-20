/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ApplicationStart, IBasePath } from 'kibana/public';
import { ForwardDefinition } from './plugin';

export function navigateToDefaultApp(
  defaultAppId: string,
  forwards: ForwardDefinition[],
  application: ApplicationStart,
  basePath: IBasePath,
  currentAppId: string | undefined,
  overwriteHash: boolean
) {
  // navigate to the respective path in the legacy kibana plugin by default (for unmigrated plugins)
  let targetAppId = 'kibana';
  let targetAppPath = `#/${defaultAppId}`;

  // try to find an existing redirect for the target path if possible
  // this avoids having to load the legacy app just to get redirected to a core application again afterwards
  const relevantForward = forwards.find((forward) => defaultAppId.startsWith(forward.legacyAppId));
  if (relevantForward) {
    targetAppPath = relevantForward.rewritePath(`/${defaultAppId}`);
    targetAppId = relevantForward.newAppId;
  }

  // when the correct app is already loaded, just set the hash to the right value
  // otherwise use navigateToApp (or setting href in case of kibana app)
  if (currentAppId !== targetAppId) {
    application.navigateToApp(targetAppId, { path: targetAppPath, replace: true });
  } else if (overwriteHash) {
    window.location.hash = targetAppPath;
  }
}
