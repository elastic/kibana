/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import type { ISessionService } from '@kbn/data-plugin/public';

export interface UseSearchSessionResult {
  /** The active search session id; stable for the consumer's lifetime unless refreshed. */
  searchSessionId: string;
  /** Start a fresh session, replacing the current `searchSessionId`. */
  refreshSearchSession: () => void;
}

/**
 * Starts a search session on mount, returns the id plus a `refresh` callback,
 * and clears the session on unmount.
 *
 * `sessionService` is assumed to be stable across renders (it's a singleton
 * exposed by `data.search.session`).
 */
export const useSearchSession = (sessionService: ISessionService): UseSearchSessionResult => {
  const [searchSessionId, setSearchSessionId] = useState<string>(() => sessionService.start());

  const refreshSearchSession = useCallback(() => {
    setSearchSessionId(sessionService.start());
  }, [sessionService]);

  useEffect(() => {
    return () => {
      sessionService.clear();
    };
  }, [sessionService]);

  return { searchSessionId, refreshSearchSession };
};
