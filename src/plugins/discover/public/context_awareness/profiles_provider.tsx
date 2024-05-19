/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, FC, useContext, useMemo, useState } from 'react';
import type { ComposableProfile } from './composable_profile';
import { dataSourceProfileService } from './profiles/data_source_profile';
import { documentProfileService } from './profiles/document_profile';
import { rootProfileService } from './profiles/root_profile';
import { ProfilesManager } from './profiles_manager';

const profilesContext = createContext<ComposableProfile[]>([]);

export const ProfilesProvider: FC<{
  rootProfile: ComposableProfile;
  dataSourceProfile: ComposableProfile | undefined;
}> = ({ rootProfile, dataSourceProfile, children }) => {
  const [manager] = useState(
    () => new ProfilesManager(rootProfileService, dataSourceProfileService, documentProfileService)
  );
  const profiles = useMemo(
    () => [rootProfile, dataSourceProfile].filter(profileExists),
    [dataSourceProfile, rootProfile]
  );

  return <profilesContext.Provider value={profiles}>{children}</profilesContext.Provider>;
};

export const useProfiles = () => useContext(profilesContext);

const profileExists = (profile?: ComposableProfile): profile is ComposableProfile => {
  return profile !== undefined;
};
