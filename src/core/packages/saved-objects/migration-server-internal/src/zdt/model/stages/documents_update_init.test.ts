/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getOutdatedDocumentsQueryMock,
  createDocumentTransformFnMock,
  checkVersionCompatibilityMock,
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
    checkVersionCompatibilityMock.mockReset().mockReturnValue({
      status: 'equal',
    });

    context = createContextMock();
    context.typeRegistry.registerType(createType({ name: 'foo' }));
    context.typeRegistry.registerType(createType({ name: 'bar' }));
  });

  describe('when state.previousAlgorithm is `v2`', () => {
    it('DOCUMENTS_UPDATE_INIT -> SET_DOC_MIGRATION_STARTED', () => {
      const state = createState({
        previousAlgorithm: 'v2',
      });
      const res: ResponseType<'DOCUMENTS_UPDATE_INIT'> = Either.right('noop' as const);

      const newState = documentsUpdateInit(
        state,
        res as StateActionResponse<'DOCUMENTS_UPDATE_INIT'>,
        context
      );
      expect(newState.controlState).toEqual('SET_DOC_MIGRATION_STARTED');
    });
  });

  describe('when checkVersionCompatibility returns `greater`', () => {
    beforeEach(() => {
      checkVersionCompatibilityMock.mockReturnValue({
        status: 'greater',
      });
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

    it('DOCUMENTS_UPDATE_INIT -> SET_DOC_MIGRATION_STARTED', () => {
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
        logs: expect.any(Array),
      });
    });

    it('adds a log entry about the version check', () => {
      const state = createState();
      const res: ResponseType<'DOCUMENTS_UPDATE_INIT'> = Either.right('noop' as const);

      createDocumentTransformFnMock.mockReturnValue(jest.fn());
      getOutdatedDocumentsQueryMock.mockReturnValue(Symbol());

      const newState = documentsUpdateInit(
        state,
        res as StateActionResponse<'DOCUMENTS_UPDATE_INIT'>,
        context
      );

      expect(newState.logs.map((entry) => entry.message)).toEqual([
        `DOCUMENTS_UPDATE_INIT: doc version check result: greater`,
      ]);
    });
  });

  describe('when checkVersionCompatibility returns `equal`', () => {
    beforeEach(() => {
      checkVersionCompatibilityMock.mockReturnValue({
        status: 'equal',
      });
    });

    it('DOCUMENTS_UPDATE_INIT -> DONE', () => {
      const state = createState();
      const res: ResponseType<'DOCUMENTS_UPDATE_INIT'> = Either.right('noop' as const);

      const newState = documentsUpdateInit(
        state,
        res as StateActionResponse<'DOCUMENTS_UPDATE_INIT'>,
        context
      );

      expect(newState).toEqual({
        ...state,
        controlState: 'DONE',
        logs: expect.any(Array),
      });
    });

    it('adds a log entry about the version check', () => {
      const state = createState();
      const res: ResponseType<'DOCUMENTS_UPDATE_INIT'> = Either.right('noop' as const);

      createDocumentTransformFnMock.mockReturnValue(jest.fn());
      getOutdatedDocumentsQueryMock.mockReturnValue(Symbol());

      const newState = documentsUpdateInit(
        state,
        res as StateActionResponse<'DOCUMENTS_UPDATE_INIT'>,
        context
      );

      expect(newState.logs.map((entry) => entry.message)).toEqual([
        `DOCUMENTS_UPDATE_INIT: doc version check result: equal`,
      ]);
    });
  });

  describe('when checkVersionCompatibility returns `lesser`', () => {
    beforeEach(() => {
      checkVersionCompatibilityMock.mockReturnValue({
        status: 'lesser',
      });
    });

    it('DOCUMENTS_UPDATE_INIT -> DONE', () => {
      const state = createState();
      const res: ResponseType<'DOCUMENTS_UPDATE_INIT'> = Either.right('noop' as const);

      const newState = documentsUpdateInit(
        state,
        res as StateActionResponse<'DOCUMENTS_UPDATE_INIT'>,
        context
      );

      expect(newState).toEqual({
        ...state,
        controlState: 'DONE',
        logs: expect.any(Array),
      });
    });

    it('adds a log entry about the version check', () => {
      const state = createState();
      const res: ResponseType<'DOCUMENTS_UPDATE_INIT'> = Either.right('noop' as const);

      createDocumentTransformFnMock.mockReturnValue(jest.fn());
      getOutdatedDocumentsQueryMock.mockReturnValue(Symbol());

      const newState = documentsUpdateInit(
        state,
        res as StateActionResponse<'DOCUMENTS_UPDATE_INIT'>,
        context
      );

      expect(newState.logs.map((entry) => entry.message)).toEqual([
        `DOCUMENTS_UPDATE_INIT: doc version check result: lesser`,
      ]);
    });
  });

  describe('when checkVersionCompatibility returns `conflict`', () => {
    beforeEach(() => {
      checkVersionCompatibilityMock.mockReturnValue({
        status: 'conflict',
      });
    });

    it('DOCUMENTS_UPDATE_INIT -> FATAL', () => {
      const state = createState();
      const res: ResponseType<'DOCUMENTS_UPDATE_INIT'> = Either.right('noop' as const);

      const newState = documentsUpdateInit(
        state,
        res as StateActionResponse<'DOCUMENTS_UPDATE_INIT'>,
        context
      );

      expect(newState).toEqual({
        ...state,
        controlState: 'FATAL',
        reason: 'Model version conflict: inconsistent higher/lower versions',
        logs: expect.any(Array),
      });
    });

    it('adds a log entry about the version check', () => {
      const state = createState();
      const res: ResponseType<'DOCUMENTS_UPDATE_INIT'> = Either.right('noop' as const);

      createDocumentTransformFnMock.mockReturnValue(jest.fn());
      getOutdatedDocumentsQueryMock.mockReturnValue(Symbol());

      const newState = documentsUpdateInit(
        state,
        res as StateActionResponse<'DOCUMENTS_UPDATE_INIT'>,
        context
      );

      expect(newState.logs.map((entry) => entry.message)).toEqual([
        `DOCUMENTS_UPDATE_INIT: doc version check result: conflict`,
      ]);
    });
  });
});
