/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useSelector } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { createSelector } from 'reselect';
import type { GroupModel, GroupState } from './types';

export const useDeepEqualSelector = (selector) => useSelector(selector, deepEqual);

export const groupSelector = ({ groups }: GroupState, id: string): GroupModel => groups[id];
export const groupIdSelector = () => createSelector(groupSelector, (group) => group);
