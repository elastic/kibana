/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { DataSourceProfileService, DocumentProfileService, RootProfileService } from './profiles';
import { GetProfilesOptions, ProfilesManager } from './profiles_manager';

const profilesContext = createContext(
  new ProfilesManager(
    new RootProfileService(),
    new DataSourceProfileService(),
    new DocumentProfileService()
  )
);

export const ProfilesProvider = profilesContext.Provider;

export const useProfiles = ({ record }: GetProfilesOptions = {}) => {
  const manager = useContext(profilesContext);
  const profiles$ = useMemo(() => manager.getProfiles$({ record }), [manager, record]);
  const profiles = useMemo(() => manager.getProfiles({ record }), [manager, record]);

  return useObservable(profiles$, profiles);
};
