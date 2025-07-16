/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import { type GetProfilesOptions } from '../profiles_manager';
import { useScopedServices } from '../../components/scoped_services_provider';

/**
 * Hook to retreive the resolved profiles
 * @param options Profiles options
 * @returns The resolved profiles
 */
export const useProfiles = ({ record }: GetProfilesOptions = {}) => {
  const { scopedProfilesManager } = useScopedServices();
  const [profiles, setProfiles] = useState(() => scopedProfilesManager.getProfiles({ record }));
  const profiles$ = useMemo(
    () => scopedProfilesManager.getProfiles$({ record }),
    [scopedProfilesManager, record]
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
