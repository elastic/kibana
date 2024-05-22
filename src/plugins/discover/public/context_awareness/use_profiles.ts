/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useDiscoverServices } from '../hooks/use_discover_services';
import { GetProfilesOptions } from './profiles_manager';

export const useProfiles = ({ record }: GetProfilesOptions = {}) => {
  const { profilesManager } = useDiscoverServices();

  const profiles$ = useMemo(
    () => profilesManager.getProfiles$({ record }),
    [profilesManager, record]
  );

  const profiles = useMemo(
    () => profilesManager.getProfiles({ record }),
    [profilesManager, record]
  );

  return useObservable(profiles$, profiles);
};
