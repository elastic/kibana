/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useMemo, useState } from 'react';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { GetProfilesOptions } from '../profiles_manager';

export const useProfiles = ({ record }: GetProfilesOptions = {}) => {
  const { profilesManager } = useDiscoverServices();
  const [profiles, setProfiles] = useState(() => profilesManager.getProfiles({ record }));
  const profiles$ = useMemo(
    () => profilesManager.getProfiles$({ record }),
    [profilesManager, record]
  );

  useEffect(() => {
    const subscription = profiles$.subscribe((newProfiles) => {
      setProfiles((currentProfiles) => {
        return currentProfiles.every((profile, i) => profile === newProfiles[i])
          ? currentProfiles
          : newProfiles;
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [profiles$]);

  return profiles;
};
