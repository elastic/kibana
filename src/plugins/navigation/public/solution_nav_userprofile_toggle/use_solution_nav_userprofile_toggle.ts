/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useState } from 'react';
import { useUpdateUserProfile } from '@kbn/user-profile-components';

interface Deps {
  defaultOptOutValue: boolean;
}

export const useSolutionNavUserProfileToggle = ({ defaultOptOutValue }: Deps) => {
  const [hasOptOut, setHasOptOut] = useState(defaultOptOutValue);
  const { userProfileData, isLoading, update, userProfileEnabled } = useUpdateUserProfile();

  const { userSettings: { solutionNavOptOut = defaultOptOutValue } = {} } = userProfileData ?? {};

  const toggle = useCallback(
    (on: boolean) => {
      if (isLoading) {
        return;
      }

      // optimistic update
      setHasOptOut(on);

      update({
        userSettings: {
          solutionNavOptOut: on,
        },
      });
    },
    [isLoading, update]
  );

  useEffect(() => {
    setHasOptOut(solutionNavOptOut);
  }, [solutionNavOptOut]);

  return {
    toggle,
    hasOptOut,
    userProfileEnabled,
  };
};
