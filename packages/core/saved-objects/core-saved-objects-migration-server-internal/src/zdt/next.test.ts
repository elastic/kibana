/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ActionMocks,
  setMetaDocMigrationStartedMock,
  setMetaDocMigrationCompleteMock,
  setMetaMappingMigrationCompleteMock,
} from './next.test.mocks';
import { nextActionMap, type ActionMap } from './next';
import {
  createContextMock,
  type MockedMigratorContext,
  createPostDocInitState,
} from './test_helpers';
import type {
  SetDocMigrationStartedState,
  UpdateMappingModelVersionState,
  UpdateDocumentModelVersionsState,
  UpdateIndexMappingsState,
} from './state';

describe('actions', () => {
  let context: MockedMigratorContext;
  let actionMap: ActionMap;

  beforeEach(() => {
    jest.clearAllMocks();

    context = createContextMock();
    actionMap = nextActionMap(context);
  });

  describe('SET_DOC_MIGRATION_STARTED', () => {
    it('calls setMetaDocMigrationStarted with the correct parameters', () => {
      const state: SetDocMigrationStartedState = {
        ...createPostDocInitState(),
        controlState: 'SET_DOC_MIGRATION_STARTED',
      };
      const action = actionMap.SET_DOC_MIGRATION_STARTED;

      action(state);

      expect(setMetaDocMigrationStartedMock).toHaveBeenCalledTimes(1);
      expect(setMetaDocMigrationStartedMock).toHaveBeenCalledWith({
        meta: state.currentIndexMeta,
      });
    });

    it('calls the updateIndexMeta action with the correct parameters', () => {
      const state: SetDocMigrationStartedState = {
        ...createPostDocInitState(),
        controlState: 'SET_DOC_MIGRATION_STARTED',
      };
      const action = actionMap.SET_DOC_MIGRATION_STARTED;

      const someMeta = { some: 'meta' };
      setMetaDocMigrationStartedMock.mockReturnValue(someMeta);

      action(state);

      expect(ActionMocks.updateIndexMeta).toHaveBeenCalledTimes(1);
      expect(ActionMocks.updateIndexMeta).toHaveBeenCalledWith({
        client: context.elasticsearchClient,
        index: state.currentIndex,
        meta: someMeta,
      });
    });
  });

  describe('UPDATE_MAPPING_MODEL_VERSIONS', () => {
    it('calls setMetaMappingMigrationComplete with the correct parameters', () => {
      const state: UpdateMappingModelVersionState = {
        ...createPostDocInitState(),
        controlState: 'UPDATE_MAPPING_MODEL_VERSIONS',
      };
      const action = actionMap.UPDATE_MAPPING_MODEL_VERSIONS;

      action(state);

      expect(setMetaMappingMigrationCompleteMock).toHaveBeenCalledTimes(1);
      expect(setMetaMappingMigrationCompleteMock).toHaveBeenCalledWith({
        meta: state.currentIndexMeta,
        versions: context.typeVirtualVersions,
      });
    });

    it('calls the updateIndexMeta action with the correct parameters', () => {
      const state: UpdateMappingModelVersionState = {
        ...createPostDocInitState(),
        controlState: 'UPDATE_MAPPING_MODEL_VERSIONS',
      };
      const action = actionMap.UPDATE_MAPPING_MODEL_VERSIONS;

      const someMeta = { some: 'meta' };
      setMetaMappingMigrationCompleteMock.mockReturnValue(someMeta);

      action(state);

      expect(ActionMocks.updateIndexMeta).toHaveBeenCalledTimes(1);
      expect(ActionMocks.updateIndexMeta).toHaveBeenCalledWith({
        client: context.elasticsearchClient,
        index: state.currentIndex,
        meta: someMeta,
      });
    });
  });

  describe('UPDATE_DOCUMENT_MODEL_VERSIONS', () => {
    it('calls setMetaDocMigrationComplete with the correct parameters', () => {
      const state: UpdateDocumentModelVersionsState = {
        ...createPostDocInitState(),
        controlState: 'UPDATE_DOCUMENT_MODEL_VERSIONS',
      };
      const action = actionMap.UPDATE_DOCUMENT_MODEL_VERSIONS;

      action(state);

      expect(setMetaDocMigrationCompleteMock).toHaveBeenCalledTimes(1);
      expect(setMetaDocMigrationCompleteMock).toHaveBeenCalledWith({
        meta: state.currentIndexMeta,
        versions: context.typeVirtualVersions,
      });
    });

    it('calls the updateIndexMeta action with the correct parameters', () => {
      const state: UpdateDocumentModelVersionsState = {
        ...createPostDocInitState(),
        controlState: 'UPDATE_DOCUMENT_MODEL_VERSIONS',
      };
      const action = actionMap.UPDATE_DOCUMENT_MODEL_VERSIONS;

      const someMeta = { some: 'meta' };
      setMetaDocMigrationCompleteMock.mockReturnValue(someMeta);

      action(state);

      expect(ActionMocks.updateIndexMeta).toHaveBeenCalledTimes(1);
      expect(ActionMocks.updateIndexMeta).toHaveBeenCalledWith({
        client: context.elasticsearchClient,
        index: state.currentIndex,
        meta: someMeta,
      });
    });
  });

  describe('UPDATE_INDEX_MAPPINGS', () => {
    it('calls updateAndPickupMappings with the correct parameters', () => {
      const state: UpdateIndexMappingsState = {
        ...createPostDocInitState(),
        controlState: 'UPDATE_INDEX_MAPPINGS',
        additiveMappingChanges: {
          someToken: {},
        },
      };
      const action = actionMap.UPDATE_INDEX_MAPPINGS;

      action(state);

      expect(ActionMocks.updateAndPickupMappings).toHaveBeenCalledTimes(1);
      expect(ActionMocks.updateAndPickupMappings).toHaveBeenCalledWith({
        client: context.elasticsearchClient,
        index: state.currentIndex,
        mappings: {
          properties: {
            someToken: {},
          },
        },
        batchSize: context.batchSize,
        query: {
          bool: {
            should: [{ term: { type: 'someToken' } }],
          },
        },
      });
    });
  });
});
