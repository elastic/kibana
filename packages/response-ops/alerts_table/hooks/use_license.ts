/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ILicense, LicenseType } from '@kbn/licensing-plugin/public';
import { useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';

interface UseLicenseReturnValue {
  isAtLeastPlatinum: () => boolean;
}

interface UseLicenseProps {
  licensing: LicensingPluginStart;
}

export const useLicense = ({ licensing }: UseLicenseProps): UseLicenseReturnValue => {
  const license = useObservable<ILicense | null>(licensing?.license$ ?? new Observable(), null);

  const isAtLeast = useCallback(
    (level: LicenseType): boolean => {
      return !!license && license.isAvailable && license.isActive && license.hasAtLeast(level);
    },
    [license]
  );

  const isAtLeastPlatinum = useCallback(() => isAtLeast('platinum'), [isAtLeast]);

  return {
    isAtLeastPlatinum,
  };
};
