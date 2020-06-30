/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
