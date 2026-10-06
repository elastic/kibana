/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISessionService } from './session_service';
import type { SearchSessionState } from './search_session_state';
/**
 * Options for {@link waitUntilNextSessionCompletes$}
 */
export interface WaitUntilNextSessionCompletesOptions {
  /**
   * For how long to wait between session state transitions before considering that session completed
   */
  waitForIdle?: number;
}
/**
 * Creates an observable that emits when next search session completes.
 * This utility is helpful to use in the application to delay some tasks until next session completes.
 *
 * @param sessionService - {@link ISessionService}
 * @param opts - {@link WaitUntilNextSessionCompletesOptions}
 */
export declare function waitUntilNextSessionCompletes$(
  sessionService: ISessionService,
  { waitForIdle }?: WaitUntilNextSessionCompletesOptions
): import('rxjs').Observable<SearchSessionState.Completed | SearchSessionState.BackgroundCompleted>;
