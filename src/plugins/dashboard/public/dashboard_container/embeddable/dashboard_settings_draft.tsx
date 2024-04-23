/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import once from 'lodash/once';
import { BehaviorSubject } from 'rxjs';
import { useCallback, useEffect, useState } from 'react';
import { useDashboardContainer } from './dashboard_container';

export type DashboardSettings = ReturnType<ReturnType<typeof useDashboardContainer>['getInput']>;

const createDashboardDraftSettings = once(function createDashboardDraftSettingsObservable() {
  return new BehaviorSubject<DashboardSettings | null>(null);
});

export const dashboardDraftSettings$ = createDashboardDraftSettings();

export function useDashboardSettingsDraft<T extends DashboardSettings = DashboardSettings>(
  initialValue: T
): [T, (args: (prev: T) => T) => void] {
  const [draftSettingsValue, setSettingsDraftValue] = useState<T>(initialValue);

  useEffect(() => {
    if (initialValue) {
      dashboardDraftSettings$.next(initialValue);

      return () => {
        // reset on unmount
        dashboardDraftSettings$.next(null);
      };
    }
  }, [initialValue]);

  useEffect(() => {
    const subscription = dashboardDraftSettings$.subscribe((value) => {
      if (value) {
        setSettingsDraftValue(value as T);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const draftSettingsValueSetter = useCallback(
    (val: (prev: T) => T) => {
      dashboardDraftSettings$.next(val(draftSettingsValue));
    },
    [draftSettingsValue]
  );

  return [draftSettingsValue, draftSettingsValueSetter];
}
