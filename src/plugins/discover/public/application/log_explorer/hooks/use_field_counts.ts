/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { interpret } from 'xstate';
import { useSelector } from '@xstate/react';
import isDeepEqual from 'fast-deep-equal';
import { EntriesService, memoizedSelectFieldCounts } from '../state_machines/entries_state_machine';

export const useFieldCounts = (stateMachine: EntriesService) => {
  console.log(stateMachine.machine);
  console.log(interpret(stateMachine.machine));
  return useSelector(stateMachine, memoizedSelectFieldCounts, isDeepEqual);
};
