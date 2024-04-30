/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REDUX_ID_FOR_MEMORY_STORAGE } from '../constants';
import { useExpandableFlyoutContext } from '../context';
import { selectPanelsById, useSelector } from '../redux';

/**
 * This hook allows you to access the flyout state, read open right, left and preview panels.
 */
export const useExpandableFlyoutState = () => {
  const { urlKey } = useExpandableFlyoutContext();
  // if no urlKey is provided, we are in memory storage mode and use the reserved word 'memory'
  const id = urlKey || REDUX_ID_FOR_MEMORY_STORAGE;
  return useSelector(selectPanelsById(id));
};
