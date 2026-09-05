/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Option from 'fp-ts/Option';
import type { PostInitState } from '../migration_state';
import type { IO, CheckTargetMappingsResponse } from '../io';
import { appendLogLevel, transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import { buildPickupMappingsQuery } from '../../core/build_pickup_mappings_query';
import type { Step, SuccessorsOf } from '../types';
import * as CHECK_VERSION_INDEX_READY_ACTIONS from './check_version_index_ready_actions';
import * as UPDATE_TARGET_MAPPINGS_PROPERTIES from './update_target_mappings_properties';
import * as UPDATE_TARGET_MAPPINGS_META from './update_target_mappings_meta';

export const Name = 'CHECK_TARGET_MAPPINGS' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, CheckTargetMappingsResponse> => ({
  action: () => io.checkTargetMappings(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {});
    }
    if (response.type === 'types_match') {
      return transitionTo(
        appendLogLevel(state, {
          level: 'info',
          message:
            'There are no changes in the mappings of any of the SO types, skipping UPDATE_TARGET_MAPPINGS steps.',
        }),
        CHECK_VERSION_INDEX_READY_ACTIONS.Name,
        {}
      );
    }
    if (response.type === 'index_mappings_incomplete') {
      return transitionTo(state, UPDATE_TARGET_MAPPINGS_PROPERTIES.Name, {
        updatedTypesQuery: Option.none,
      });
    }
    if (response.type === 'types_changed') {
      return transitionTo(
        appendLogLevel(state, {
          level: 'info',
          message: `Documents of the following SO types will be updated, so that ES can pickup the updated mappings: ${response.updatedTypes}.`,
        }),
        UPDATE_TARGET_MAPPINGS_PROPERTIES.Name,
        { updatedTypesQuery: Option.some(buildPickupMappingsQuery(response.updatedTypes)) }
      );
    }
    return transitionTo(state, UPDATE_TARGET_MAPPINGS_META.Name, {});
  },
});
