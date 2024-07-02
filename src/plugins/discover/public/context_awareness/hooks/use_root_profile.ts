/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import { useDiscoverServices } from '../../hooks/use_discover_services';

export const useRootProfile = ({ solutionNavId }: { solutionNavId: string | null }) => {
  const { profilesManager } = useDiscoverServices();
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
