/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useDiscoverServices } from '../../hooks/use_discover_services';

/**
 * Hook to trigger and wait for root profile resolution
 * @param options Options object
 * @returns If the root profile is loading
 */
export const useRootProfile = () => {
  const { profilesManager, core } = useDiscoverServices();
  const solutionNavId = useObservable(core.chrome.getActiveSolutionNavId$());
  const [rootProfileLoading, setRootProfileLoading] = useState(true);

  useEffect(() => {
    let aborted = false;

    setRootProfileLoading(true);

    profilesManager.resolveRootProfile({ solutionNavId }).then(() => {
      if (!aborted) {
        setRootProfileLoading(false);
      }
    });

    return () => {
      aborted = true;
    };
  }, [profilesManager, solutionNavId]);

  return { rootProfileLoading };
};
