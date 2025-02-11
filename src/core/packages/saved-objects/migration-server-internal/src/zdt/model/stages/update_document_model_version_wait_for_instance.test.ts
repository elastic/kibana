/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import {
  createContextMock,
  createPostDocInitState,
  type MockedMigratorContext,
} from '../../test_helpers';
import type { UpdateDocumentModelVersionsWaitForInstancesState } from '../../state';
import type { StateActionResponse } from '../types';
import { updateDocumentModelVersionWaitForInstances } from './update_document_model_version_wait_for_instances';

describe('Stage: updateDocumentModelVersionWaitForInstances', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<UpdateDocumentModelVersionsWaitForInstancesState> = {}
  ): UpdateDocumentModelVersionsWaitForInstancesState => ({
    ...createPostDocInitState(),
    controlState: 'UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES -> DONE when successful', () => {
    const state = createState();
    const res = Either.right(
      'wait_succeeded' as const
    ) as StateActionResponse<'SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES'>;

    const newState = updateDocumentModelVersionWaitForInstances(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'DONE',
    });
  });
});
