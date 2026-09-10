/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Option from 'fp-ts/Option';
import type { MigrationBaseState } from '../migration_state';
import type { IO, InitResponse } from '../io';
import { resetRetry, transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import type { Step, SuccessorsOf } from '../types';
import * as WAIT_FOR_MIGRATION_COMPLETION from './wait_for_migration_completion';
import * as WAIT_FOR_YELLOW_SOURCE from './wait_for_yellow_source';
import * as CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION from './create_index_check_cluster_routing_allocation';
import * as FATAL from './fatal';

export const Name = 'INIT' as const;

export interface State extends MigrationBaseState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, InitResponse> => ({
  action: () => io.init(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {});
    }
    if (response.type === 'fatal') {
      return transitionTo(state, FATAL.Name, { reason: response.reason });
    }
    const { postInit } = response;
    const base = resetRetry({ ...state, ...postInit });
    switch (response.type) {
      case 'wait_for_migration_completion':
        return transitionTo(
          {
            ...base,
            retryDelay: 2000,
            logs: [
              ...base.logs,
              {
                level: 'info',
                message: `Migration required. Waiting until another Kibana instance completes the migration.`,
              },
            ],
          },
          WAIT_FOR_MIGRATION_COMPLETION.Name,
          {}
        );
      case 'wait_for_yellow_source':
        return transitionTo(base, WAIT_FOR_YELLOW_SOURCE.Name, {
          sourceIndex: postInit.sourceIndex,
          sourceIndexMappings: postInit.sourceIndexMappings,
          targetIndex: postInit.targetIndex,
        });
      case 'create_index_check_routing':
        return transitionTo(
          {
            ...base,
            sourceIndex: Option.none,
            versionIndexReadyActions: postInit.versionIndexReadyActions,
          },
          CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION.Name,
          {}
        );
    }
  },
});
