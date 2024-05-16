/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, FC, useContext, useMemo, useState } from 'react';
import { ComposableProfile } from './composable_profile';

const profilesContext = createContext<{
  profiles: ComposableProfile[];
  setDataSourceProfile: (profile: ComposableProfile) => void;
}>({
  profiles: [],
  setDataSourceProfile: () => {},
});

export const ProfilesProvider: FC<{ rootProfile: ComposableProfile }> = ({
  rootProfile,
  children,
}) => {
  const [dataSourceProfile, setDataSourceProfile] = useState<ComposableProfile>();
  const profiles = useMemo(
    () => [rootProfile, dataSourceProfile].filter(profileExists),
    [dataSourceProfile, rootProfile]
  );

  return (
    <profilesContext.Provider value={{ profiles, setDataSourceProfile }}>
      {children}
    </profilesContext.Provider>
  );
};

export const useProfiles = () => useContext(profilesContext);

const profileExists = (profile?: ComposableProfile): profile is ComposableProfile => {
  return profile !== undefined;
};
