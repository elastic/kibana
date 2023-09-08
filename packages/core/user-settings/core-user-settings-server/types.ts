/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { KibanaRequest } from '@kbn/core-http-server';

/** @public */
export interface UserSettingsServiceSetup {
  setUserProfileSettings: (client: UserProfileSettingsClientContract) => void;
}

export interface UserProfileSettingsClientContract {
  get: (request: KibanaRequest) => Promise<Record<string, string>>;
}
