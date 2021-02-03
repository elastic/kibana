/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
