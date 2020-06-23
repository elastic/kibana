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
import { ForwardDefinition } from '../index';

export const navigateToLegacyKibanaUrl = (
  path: string,
  forwards: ForwardDefinition[],
  basePath: IBasePath,
  application: ApplicationStart,
  location: Location
) => {
  // navigate to the respective path in the legacy kibana plugin by default (for unmigrated plugins)
  let targetAppId = 'kibana';
  let targetAppPath = path;

  // try to find an existing redirect for the target path if possible
  // this avoids having to load the legacy app just to get redirected to a core application again afterwards
  const relevantForward = forwards.find((forward) => path.startsWith(`/${forward.legacyAppId}`));
  if (relevantForward) {
    targetAppPath = relevantForward.rewritePath(path);
    targetAppId = relevantForward.newAppId;
  }

  if (targetAppId === 'kibana') {
    // exception for kibana app because redirect won't work right otherwise
    location.href = basePath.prepend(`/app/kibana#${targetAppPath}`);
  } else {
    application.navigateToApp(targetAppId, { path: targetAppPath });
  }
};
