/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { ISessionService, SearchSessionInfoProvider } from './session_service';
export { SessionService } from './session_service';
export { SearchSessionState } from './search_session_state';
export type { ISessionsClient } from './sessions_client';
export { SessionsClient } from './sessions_client';
export { noSearchSessionStorageCapabilityMessage } from './i18n';
export { SEARCH_SESSIONS_MANAGEMENT_ID } from './constants';
export type { WaitUntilNextSessionCompletesOptions } from './session_helpers';
export { waitUntilNextSessionCompletes$ } from './session_helpers';
