/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useSelector } from '@xstate/react';
import isDeepEqual from 'fast-deep-equal';
import { memoizedSelectFieldCounts } from '../state_machines/entries_state_machine';
import { EntriesActorRef } from '../state_machines';

export const useFieldCounts = (stateMachine: EntriesActorRef) => {
  return useSelector(stateMachine, memoizedSelectFieldCounts, isDeepEqual);
};
