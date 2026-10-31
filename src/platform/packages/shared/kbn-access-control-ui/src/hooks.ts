/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HttpSetup } from '@kbn/core-http-browser';
import { createAccessControlApi } from './api';
import type { AccessPolicyResponse, AccessStateResponse } from './types';

export interface AsyncResource<T> {
  data?: T;
  error?: AccessControlError;
  isLoading: boolean;
  reload: () => void;
}

/**
 * Error from the access control API, with the HTTP status code when there is one.
 */
export interface AccessControlError {
  statusCode?: number;
  message: string;
}

export const toAccessControlError = (error: {
  message: string;
  body?: { statusCode?: number; message?: string };
}): AccessControlError => ({
  statusCode: error.body?.statusCode,
  message: error.body?.message ?? error.message,
});

/**
 * Loads a resource and reloads it on demand. A reload keeps the previous data until the new data
 * arrives, so that the panel does not flicker after a save.
 */
const useAsyncResource = <T>(load: (() => Promise<T>) | undefined): AsyncResource<T> => {
  const [result, setResult] = useState<{ data?: T; error?: AccessControlError }>({});
  const [isLoading, setIsLoading] = useState(!!load);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!load) {
      setIsLoading(false);
      return;
    }

    let isCurrent = true;
    setIsLoading(true);
    // A load that throws, or returns no promise, ends as a failed or empty load instead of
    // breaking the page that hosts the panel.
    Promise.resolve()
      .then(load)
      .then(
        (data) => isCurrent && setResult({ data }),
        (error) => isCurrent && setResult({ error: toAccessControlError(error) })
      )
      .finally(() => isCurrent && setIsLoading(false));

    return () => {
      isCurrent = false;
    };
  }, [load, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  return { ...result, isLoading, reload };
};

export const useAccessControlApi = (http: Pick<HttpSetup, 'get' | 'put' | 'post'>) =>
  useMemo(() => createAccessControlApi(http), [http]);

/**
 * Loads a type's access policy, which also says whether object-level security is enabled.
 */
export const useAccessPolicy = (
  http: Pick<HttpSetup, 'get' | 'put' | 'post'>,
  type: string
): AsyncResource<AccessPolicyResponse> => {
  const api = useAccessControlApi(http);
  return useAsyncResource(useCallback(() => api.getPolicy(type), [api, type]));
};

/**
 * Loads what the current user can do with an object. Pass `isEnabled: false` to skip the request,
 * for example while object-level security is disabled.
 */
export const useObjectAccess = (
  http: Pick<HttpSetup, 'get' | 'put' | 'post'>,
  type: string,
  id: string | undefined,
  { isEnabled = true }: { isEnabled?: boolean } = {}
): AsyncResource<AccessStateResponse> => {
  const api = useAccessControlApi(http);
  return useAsyncResource(
    useMemo(
      () => (isEnabled && id ? () => api.get(type, id) : undefined),
      [api, type, id, isEnabled]
    )
  );
};
