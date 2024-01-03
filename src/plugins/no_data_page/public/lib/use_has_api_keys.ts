/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { useEffect, useState } from 'react';
import { NO_DATA_API_PATHS } from '../../common';
import { HasApiKeysResponse } from '../types';

/**
 * Creation function for the "useHasApiKeys" React hook.
 *
 * Usage:
 * const MyComponent: React.FC = () => {
 *   const { hasApiKeys, loading, error } = useHasApiKeys();
 *
 *   // Handle error
 *   throwIfError(error);
 *
 *   // Handle loading
 *
 *   // Present custom UX for users depending on their access to API Keys
 * };
 *
 * TODO: consider moving this to a package under the Security domain
 * as it is tied to a Security API endpoint.
 */
export const createUseHasApiKeys = ({ http }: { http: HttpSetup }) => {
  return function useHasApiKeys(): HasApiKeysResponse {
    const [hasApiKeys, setHasApiKeys] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null); // NOTE: error is NOT re-thrown

    useEffect(() => {
      setLoading(true);
      http
        .get<HasApiKeysResponse>(NO_DATA_API_PATHS.internal.hasApiKeys)
        .then((response) => {
          setHasApiKeys(response.hasApiKeys);
          setLoading(false);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('Could not determine whether user has API keys:', err);
          setError(err);
          setLoading(false);
        });
    }, []);

    return { hasApiKeys, loading, error };
  };
};
