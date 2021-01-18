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

import { CoreStart } from 'kibana/public';
import { AppState } from '../../common';

const DEFAULT_APP_STATE = Object.freeze({
  insecureClusterAlert: { displayAlert: false },
  anonymousAccess: { isEnabled: false, accessURLParameters: null },
});

interface StartDeps {
  core: Pick<CoreStart, 'http'>;
}

export interface AppStateServiceStart {
  getState: () => Promise<AppState>;
}

/**
 * Service that allows to retrieve application state.
 */
export class AppStateService {
  start({ core }: StartDeps): AppStateServiceStart {
    const appStatePromise = core.http.anonymousPaths.isAnonymous(window.location.pathname)
      ? Promise.resolve(DEFAULT_APP_STATE)
      : core.http.get<AppState>('/internal/security_oss/app_state').catch(() => DEFAULT_APP_STATE);

    return { getState: () => appStatePromise };
  }
}
