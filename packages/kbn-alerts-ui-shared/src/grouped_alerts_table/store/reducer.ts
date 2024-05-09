/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { updateGroups } from './actions';
import type { Groups } from './types';

export const initialGroupingState: Groups = {};

const options = [
  {
    label: 'Rule name',
    key: 'kibana.alert.rule.name',
  },
  {
    label: 'Username',
    key: 'user.name',
  },
  {
    label: 'Host name',
    key: 'host.name',
  },
  {
    label: 'Source ip',
    key: 'source.ip',
  },
];

export const groupsReducer = reducerWithInitialState(initialGroupingState).case(
  updateGroups,
  (state, { tableId, ...rest }) => ({
    ...state,
    [tableId]: {
      activeGroups: [],
      options,
      ...(state[tableId] ? state[tableId] : {}),
      ...rest,
    },
  })
);
