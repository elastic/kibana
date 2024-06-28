/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounceTime, first, skipUntil } from 'rxjs';
import { ISessionService } from './session_service';
import { SearchSessionState } from './search_session_state';

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
export function waitUntilNextSessionCompletes$(
  sessionService: ISessionService,
  { waitForIdle = 1000 }: WaitUntilNextSessionCompletesOptions = { waitForIdle: 1000 }
) {
  return sessionService.state$.pipe(
    // wait until new session starts
    skipUntil(sessionService.state$.pipe(first((state) => state === SearchSessionState.None))),
    // wait until new session starts loading
    skipUntil(sessionService.state$.pipe(first((state) => state === SearchSessionState.Loading))),
    // debounce to ignore quick switches from loading <-> completed.
    // that could happen between sequential search requests inside a single session
    debounceTime(waitForIdle),
    // then wait until it finishes
    first(
      (state) =>
        state === SearchSessionState.Completed || state === SearchSessionState.BackgroundCompleted
    )
  );
}
