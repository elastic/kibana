/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type StateComparators } from '../../../state_manager';
import type { HasParentApi } from '../../has_parent_api';
import type { HasSerializableState } from '../../has_serializable_state';
import type { HasUniqueId } from '../../has_uuid';
import type { PublishesUnsavedChanges } from '../../publishes_unsaved_changes';
export declare const UNSAVED_CHANGES_DEBOUNCE = 100;
export declare const initializeStateApi: <StateType extends object = object>({
  uuid,
  applySerializedState,
  parentApi,
  getComparators,
  defaultState,
  serializeState,
  anyStateChange$,
}: Omit<HasSerializableState<StateType>, 'latestState$'> &
  HasUniqueId &
  HasParentApi & {
    getComparators: () => StateComparators<StateType>;
    defaultState?: Partial<StateType>;
  }) => PublishesUnsavedChanges & HasSerializableState<StateType>;
