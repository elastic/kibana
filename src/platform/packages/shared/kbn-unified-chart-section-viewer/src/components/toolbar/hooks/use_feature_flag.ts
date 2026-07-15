/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import type { FeatureFlag } from '../../../common/constants';
import { useExternalServices } from '../../../context/external_services';

/**
 * Reactively evaluates a boolean feature flag from the host's `featureFlags` service
 * (see {@link FEATURE_FLAGS} for the available keys). Falls back to
 * `fallbackValue` when the host hasn't provided a `featureFlags` service (e.g. in
 * tests) so consumers don't have to special-case its absence.
 */
export const useFeatureFlag = (flagName: FeatureFlag, fallbackValue: boolean): boolean => {
  const featureFlags = useExternalServices()?.featureFlags;

  const value$ = useMemo(
    () => featureFlags?.getBooleanValue$(flagName, fallbackValue) ?? of(fallbackValue),
    [featureFlags, flagName, fallbackValue]
  );

  return useObservable(value$, fallbackValue);
};
