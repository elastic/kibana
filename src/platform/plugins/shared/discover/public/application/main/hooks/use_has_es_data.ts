/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import {
  internalStateActions,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../state_management/redux';

/**
 * Returns whether the cluster contains any data, undefined while it's still being checked.
 * The check is skipped once data was found, so it doesn't cause requests anymore.
 */
export const useHasESData = () => {
  const dispatch = useInternalStateDispatch();
  const hasESData = useInternalStateSelector((state) => state.hasESData);

  // Checking on mount keeps the result up to date for as long as there is no data,
  // the action itself skips the request once data was found
  useEffect(() => {
    dispatch(internalStateActions.checkHasESData());
  }, [dispatch]);

  return hasESData;
};
