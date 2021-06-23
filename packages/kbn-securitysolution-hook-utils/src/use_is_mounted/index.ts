/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useRef } from 'react';

type GetIsMounted = () => boolean;

/**
 *
 * @returns A {@link GetIsMounted} getter function returning whether the component is currently mounted
 */
export const useIsMounted = (): GetIsMounted => {
  const isMounted = useRef(false);
  const getIsMounted: GetIsMounted = useCallback(() => isMounted.current, []);
  const handleCleanup = useCallback(() => {
    isMounted.current = false;
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return handleCleanup;
  }, [handleCleanup]);

  return getIsMounted;
};
