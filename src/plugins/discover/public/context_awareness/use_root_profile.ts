/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import type { ProfilesManager } from './profiles_manager';

export const useRootProfile = ({
  profilesManager,
  solutionNavId,
}: {
  profilesManager: ProfilesManager;
  solutionNavId: string | null;
}) => {
  const [rootProfileLoading, setRootProfileLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    setRootProfileLoading(true);

    profilesManager.resolveRootContext({ solutionNavId }, abortController.signal).then(() => {
      if (!abortController.signal.aborted) {
        setRootProfileLoading(false);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [profilesManager, solutionNavId]);

  return { rootProfileLoading };
};
