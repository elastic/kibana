/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect } from 'react';
import { UserSettingsService } from '@kbn/core-user-settings-browser';
import { Subscription } from 'rxjs';

export const useUserSetting = <T>(userSetting: UserSettingsService, key: string) => {
  const [value, setValue] = React.useState(userSetting.get<T>(key));

  const valueSub = React.useRef<Subscription | null>(null);

  useEffect(() => {
    valueSub.current = userSetting.get$<T>(key).subscribe((newValue) => {
      setValue(newValue);
    });

    return () => {
      valueSub.current?.unsubscribe();
    };
  });

  const updateUserSetting = useCallback(
    (newValue: T) => {
      userSetting.set(key, newValue);
    },
    [userSetting, key]
  );

  return [value, updateUserSetting] as const;
};
