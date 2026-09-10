/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Option from 'fp-ts/Option';
import type { SourceExistsState } from '../migration_state';
import type { IO, UpdateSourceMappingsPropertiesResponse } from '../io';
import { resetRetry, transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import {
  getMigrationType,
  MigrationType,
  mergeMappingMeta,
  versionMigrationCompleted,
} from '../../model/helpers';
import type { Step, SuccessorsOf } from '../types';
import * as COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION from './compatible_update_check_cluster_routing_allocation';
import * as OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT from './outdated_documents_search_open_pit';
import * as FATAL from './fatal';

export const Name = 'UPDATE_SOURCE_MAPPINGS_PROPERTIES' as const;

export interface State extends SourceExistsState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO
): Step<Successors, UpdateSourceMappingsPropertiesResponse> => ({
  action: () => io.updateSourceMappingsProperties(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {});
    }
    const migrationType = getMigrationType({
      isMappingsCompatible: response.type === 'mapping_update_succeeded',
      isVersionMigrationCompleted: versionMigrationCompleted(
        state.currentAlias,
        state.versionAlias,
        state.aliases
      ),
    });
    switch (migrationType) {
      case MigrationType.Compatible:
        return transitionTo(
          resetRetry(state),
          COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION.Name,
          {}
        );
      case MigrationType.Incompatible:
        return transitionTo(state, FATAL.Name, {
          reason:
            'Incompatible mappings detected. This code path should be unreachable in a supported upgrade path. Please contact Elastic Support.',
        });
      case MigrationType.Unnecessary:
        return transitionTo(
          {
            ...resetRetry(state),
            sourceIndex: Option.none,
            targetIndex: state.sourceIndex.value,
            targetIndexMappings: mergeMappingMeta(
              state.targetIndexMappings,
              state.sourceIndexMappings.value
            ),
          },
          OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name,
          {}
        );
      case MigrationType.Invalid:
        return transitionTo(state, FATAL.Name, {
          reason: 'Incompatible mappings change on already migrated Kibana instance.',
        });
    }
  },
});
