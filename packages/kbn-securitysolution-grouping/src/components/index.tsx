/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NONE_GROUP_KEY } from './types';

export * from './group_selector';
export * from './types';
export * from './grouping';

/**
 * Checks if no group is selected
 * @param groupKeys selected group field values
 *
 * @returns {boolean} True if no group is selected
 */
export const isNoneGroup = (groupKeys: string[]) =>
  !!groupKeys.find((groupKey) => groupKey === NONE_GROUP_KEY);
