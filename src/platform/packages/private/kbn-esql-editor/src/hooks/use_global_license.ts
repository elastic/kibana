/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect, useCallback } from 'react';

import { isEqual } from 'lodash';

import type { ILicense } from '@kbn/licensing-plugin/public';

let globalLicense: ILicense | undefined;
let globalLicensePromise: Promise<ILicense | undefined> | undefined;

const subscribers: Set<(license: ILicense | undefined) => void> = new Set();

const notifySubscribers = (license: ILicense | undefined) => {
  subscribers.forEach((callback) => callback(license));
};

export const useGlobalESQLLicense = (
  getLicenseService: (() => Promise<ILicense | undefined>) | undefined
): {
  license: ILicense | undefined;
  isLoading: boolean;
  refetch: () => Promise<ILicense | undefined>;
} => {
  const [license, setLicense] = useState(globalLicense);

  const [isLoading, setIsLoading] = useState(!globalLicense);

  const fetchLicense = useCallback(async () => {
    if (globalLicensePromise) {
      return await globalLicensePromise;
    }

    globalLicensePromise = getLicenseService && getLicenseService();

    try {
      const newLicense = await globalLicensePromise;

      if (!isEqual(globalLicense, newLicense)) {
        globalLicense = newLicense;

        notifySubscribers(newLicense);
      }

      return newLicense;
    } finally {
      globalLicensePromise = undefined;
    }
  }, [getLicenseService]);

  useEffect(() => {
    const handleLicenseChange = (newLicense: ILicense | undefined) => {
      setLicense(newLicense);
      setIsLoading(false);
    };

    subscribers.add(handleLicenseChange);

    // Fetch license, if not available
    if (!globalLicense) {
      fetchLicense();
    } else {
      setIsLoading(false);
    }

    return () => {
      subscribers.delete(handleLicenseChange);
    };
  }, [fetchLicense]);

  return { license, isLoading, refetch: fetchLicense };
};
