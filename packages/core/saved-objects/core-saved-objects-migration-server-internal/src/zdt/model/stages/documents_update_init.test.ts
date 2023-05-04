/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getOutdatedDocumentsQueryMock,
  createDocumentTransformFnMock,
} from './documents_update_init.test.mocks';
import * as Either from 'fp-ts/lib/Either';
import {
  createContextMock,
  createPostInitState,
  type MockedMigratorContext,
} from '../../test_helpers';
import type { ResponseType } from '../../next';
import type { DocumentsUpdateInitState } from '../../state';
import type { StateActionResponse } from '../types';
import { documentsUpdateInit } from './documents_update_init';
import { createType } from '../../test_helpers';

describe('Stage: documentsUpdateInit', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<DocumentsUpdateInitState> = {}
  ): DocumentsUpdateInitState => ({
    ...createPostInitState(),
    controlState: 'DOCUMENTS_UPDATE_INIT',
    ...parts,
  });

  beforeEach(() => {
    getOutdatedDocumentsQueryMock.mockReset();
    createDocumentTransformFnMock.mockReset();

    context = createContextMock();
    context.typeRegistry.registerType(createType({ name: 'foo' }));
    context.typeRegistry.registerType(createType({ name: 'bar' }));
  });

  it('calls getOutdatedDocumentsQuery with the correct parameters', () => {
    const state = createState();
    const res: ResponseType<'DOCUMENTS_UPDATE_INIT'> = Either.right('noop' as const);

    documentsUpdateInit(state, res as StateActionResponse<'DOCUMENTS_UPDATE_INIT'>, context);

    expect(getOutdatedDocumentsQueryMock).toHaveBeenCalledTimes(1);
    expect(getOutdatedDocumentsQueryMock).toHaveBeenCalledWith({
      types: ['foo', 'bar'].map((type) => context.typeRegistry.getType(type)),
    });
  });

  it('calls createDocumentTransformFn with the correct parameters', () => {
    const state = createState();
    const res: ResponseType<'DOCUMENTS_UPDATE_INIT'> = Either.right('noop' as const);

    documentsUpdateInit(state, res as StateActionResponse<'DOCUMENTS_UPDATE_INIT'>, context);

    expect(createDocumentTransformFnMock).toHaveBeenCalledTimes(1);
    expect(createDocumentTransformFnMock).toHaveBeenCalledWith({
      serializer: context.serializer,
      documentMigrator: context.documentMigrator,
    });
  });

  it('DOCUMENTS_UPDATE_INIT -> SET_DOC_MIGRATION_STARTED when successful', () => {
    const state = createState();
    const res: ResponseType<'DOCUMENTS_UPDATE_INIT'> = Either.right('noop' as const);

    const newState = documentsUpdateInit(
      state,
      res as StateActionResponse<'DOCUMENTS_UPDATE_INIT'>,
      context
    );
    expect(newState.controlState).toEqual('SET_DOC_MIGRATION_STARTED');
  });

  it('updates the state with the expected properties', () => {
    const state = createState();
    const res: ResponseType<'DOCUMENTS_UPDATE_INIT'> = Either.right('noop' as const);

    const transformRawDocs = jest.fn();
    createDocumentTransformFnMock.mockReturnValue(transformRawDocs);

    const outdatedDocumentsQuery = Symbol();
    getOutdatedDocumentsQueryMock.mockReturnValue(outdatedDocumentsQuery);

    const newState = documentsUpdateInit(
      state,
      res as StateActionResponse<'DOCUMENTS_UPDATE_INIT'>,
      context
    );
    expect(newState).toEqual({
      ...state,
      controlState: 'SET_DOC_MIGRATION_STARTED',
      transformRawDocs,
      outdatedDocumentsQuery,
      excludeFromUpgradeFilterHooks: expect.any(Object),
      excludeOnUpgradeQuery: expect.any(Object),
    });
  });
});
