/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stateSelector, useSelector } from '../redux';

/**
 * This hook allows you to access the flyout state, read open panels and previews.
 */
export const useExpandableFlyoutState = () => {
  return useSelector(stateSelector);
};
