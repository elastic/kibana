/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient } from '../../elasticsearch';
import * as Actions from './actions';
import type { State } from './types';
import type { ExecutionLog } from './migrations_state_action_machine';

export async function cleanup(
  client: ElasticsearchClient,
  executionLog: ExecutionLog,
  state?: State
) {
  if (!state) return;
  if ('sourceIndexPitId' in state) {
    try {
      await Actions.closePit(client, state.sourceIndexPitId)();
    } catch (e) {
      executionLog.push({
        type: 'cleanup',
        state,
        message: e.message,
      });
    }
  }
}
