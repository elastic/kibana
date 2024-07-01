/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useDiscoverServices } from '../../hooks/use_discover_services';

export const useProfilesEnabled = () => {
  const { profilesManager } = useDiscoverServices();
  const profilesEnabled = useObservable(
    profilesManager.getProfilesEnabled$(),
    profilesManager.getProfilesEnabled()
  );

  return useMemo(
    () => ({
      profilesEnabled,
      setProfilesEnabled: (enabled: boolean) => profilesManager.setProfilesEnabled(enabled),
    }),
    [profilesEnabled, profilesManager]
  );
};
