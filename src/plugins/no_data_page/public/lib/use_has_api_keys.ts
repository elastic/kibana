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
import type { HasApiKeysApiResponse } from '../../common/types';
import { HasApiKeysResponse } from '../types';

export const createUseHasApiKeys = ({ http }: { http: HttpSetup }) => {
  return function useHasApiKeys(): HasApiKeysResponse {
    const [hasApiKeys, setHasApiKeys] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      setLoading(true);
      http
        .get<HasApiKeysApiResponse>(NO_DATA_API_PATHS.internal.hasApiKeys)
        .then((response) => {
          setHasApiKeys(response.has_api_keys);
          setLoading(false);
        })
        .catch((caughtError) => {
          setError(caughtError);
          setLoading(false);
        });
    }, []);

    return { hasApiKeys, loading, error };
  };
};
