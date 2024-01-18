/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useImperativeHandle, useMemo } from 'react';

/**
 * Publishes any API to the passed in ref. Note that any API passed in will not be rebuilt on
 * subsequent renders, so it does not support reactive variables. Instead, pass in setter functions
 * and publishing subjects to allow other components to listen to changes.
 */
export const useApiPublisher = <ApiType extends unknown = unknown>(
  api: ApiType,
  ref: React.ForwardedRef<ApiType>
) => {
  const publishApi = useMemo(
    () => api,
    // disabling exhaustive deps because the API should be created once and never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useImperativeHandle(ref, () => publishApi);
};
