/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  AllActionStates,
  State,
  InitState,
  CreateTargetIndexState,
  UpdateIndexMappingsState,
  UpdateIndexMappingsWaitForTaskState,
  UpdateMappingModelVersionState,
  UpdateAliasesState,
} from './state';
import type { MigratorContext } from './context';
import * as Actions from './actions';
import { createDelayFn } from '../common/utils';

export type ActionMap = ReturnType<typeof nextActionMap>;

/**
 * The response type of the provided control state's action.
 *
 * E.g. given 'INIT', provides the response type of the action triggered by
 * `next` in the 'INIT' control state.
 */
export type ResponseType<ControlState extends AllActionStates> = Awaited<
  ReturnType<ReturnType<ActionMap[ControlState]>>
>;

export const nextActionMap = (context: MigratorContext) => {
  const client = context.elasticsearchClient;
  return {
    INIT: (state: InitState) =>
      Actions.init({
        client,
        indices: [`${context.indexPrefix}_*`],
      }),
    CREATE_TARGET_INDEX: (state: CreateTargetIndexState) =>
      Actions.createIndex({
        client,
        indexName: state.currentIndex,
        mappings: state.indexMappings,
      }),
    UPDATE_INDEX_MAPPINGS: (state: UpdateIndexMappingsState) =>
      Actions.updateAndPickupMappings({
        client,
        index: state.currentIndex,
        mappings: { properties: state.additiveMappingChanges },
      }),
    UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK: (state: UpdateIndexMappingsWaitForTaskState) =>
      Actions.waitForPickupUpdatedMappingsTask({
        client,
        taskId: state.updateTargetMappingsTaskId,
        timeout: '60s',
      }),
    UPDATE_MAPPING_MODEL_VERSIONS: (state: UpdateMappingModelVersionState) =>
      Actions.updateMappings({
        client,
        index: state.currentIndex,
        mappings: {
          properties: {},
          _meta: state.currentIndexMeta,
        },
      }),
    UPDATE_ALIASES: (state: UpdateAliasesState) =>
      Actions.updateAliases({
        client,
        aliasActions: state.aliasActions,
      }),
  };
};

export const next = (context: MigratorContext) => {
  const map = nextActionMap(context);

  return (state: State) => {
    const delay = createDelayFn(state);

    if (state.controlState === 'DONE' || state.controlState === 'FATAL') {
      // Return null if we're in one of the terminating states
      return null;
    } else {
      // Otherwise return the delayed action
      // We use an explicit cast as otherwise TS infers `(state: never) => ...`
      // here because state is inferred to be the intersection of all states
      // instead of the union.
      const nextAction = map[state.controlState] as (
        state: State
      ) => ReturnType<typeof map[AllActionStates]>;
      return delay(nextAction(state));
    }
  };
};
