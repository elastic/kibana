/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { getProfile } from '../../common/customizations';
import { createProfileRegistry } from './profile_registry';

const profilesContext = createContext(createProfileRegistry());

export const DiscoverProfilesProvider = profilesContext.Provider;

export const useDiscoverProfiles = () => {
  const registry = useContext(profilesContext);
  const { location } = useHistory();

  return useMemo(() => {
    const { profile } = getProfile(location.pathname);

    return {
      allProfiles: registry.getAll(),
      currentProfile: registry.get(profile)!,
    };
  }, [location.pathname, registry]);
};
