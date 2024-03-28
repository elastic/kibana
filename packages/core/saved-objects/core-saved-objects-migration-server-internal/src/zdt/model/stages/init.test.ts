/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getCurrentIndexMock,
  checkVersionCompatibilityMock,
  buildIndexMappingsMock,
  generateAdditiveMappingDiffMock,
  getAliasActionsMock,
  checkIndexCurrentAlgorithmMock,
  getAliasesMock,
} from './init.test.mocks';
import * as Either from 'fp-ts/lib/Either';
import { FetchIndexResponse } from '../../../actions';
import { createContextMock, MockedMigratorContext } from '../../test_helpers';
import type { InitState } from '../../state';
import type { StateActionResponse } from '../types';
import { init } from './init';

describe('Stage: init', () => {
  let context: MockedMigratorContext;

  const currentIndex = '.kibana_1';

  const createState = (parts: Partial<InitState> = {}): InitState => ({
    controlState: 'INIT',
    retryDelay: 0,
    retryCount: 0,
    logs: [],
    skipDocumentMigration: false,
    ...parts,
  });

  const createResponse = (): FetchIndexResponse => ({
    [currentIndex]: {
      aliases: {},
      mappings: {
        properties: {},
        _meta: { mappingVersions: { foo: '10.1.0', bar: '10.1.0' } },
      },
      settings: {},
    },
  });

  beforeEach(() => {
    getCurrentIndexMock.mockReset().mockReturnValue(currentIndex);
    checkVersionCompatibilityMock.mockReset().mockReturnValue({
      status: 'equal',
    });
    generateAdditiveMappingDiffMock.mockReset().mockReturnValue({});
    getAliasActionsMock.mockReset().mockReturnValue([]);
    checkIndexCurrentAlgorithmMock.mockReset().mockReturnValue('zdt');
    getAliasesMock.mockReset().mockReturnValue(Either.right({}));
    buildIndexMappingsMock.mockReset().mockReturnValue({});

    context = createContextMock({ indexPrefix: '.kibana', types: ['foo', 'bar'] });
    context.typeRegistry.registerType({
      name: 'foo',
      mappings: { properties: {} },
      namespaceType: 'single',
      hidden: false,
    });
    context.typeRegistry.registerType({
      name: 'bar',
      mappings: { properties: {} },
      namespaceType: 'single',
      hidden: false,
    });
  });

  it('INIT -> INIT when cluster routing allocation is incompatible', () => {
    const state = createState();
    const res: StateActionResponse<'INIT'> = Either.left({
      type: 'incompatible_cluster_routing_allocation',
    });

    const newState = init(state, res, context);

    expect(newState.controlState).toEqual('INIT');
    expect(newState.retryCount).toEqual(1);
    expect(newState.retryDelay).toEqual(2000);
    expect(newState.logs).toHaveLength(1);
  });

  it('calls getCurrentIndex with the correct parameters', () => {
    const state = createState();
    const fetchIndexResponse = createResponse();
    const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

    const aliases = { '.foo': '.bar' };
    getAliasesMock.mockReturnValue(Either.right(aliases));

    init(state, res, context);

    expect(getCurrentIndexMock).toHaveBeenCalledTimes(1);
    expect(getCurrentIndexMock).toHaveBeenCalledWith({
      indices: Object.keys(fetchIndexResponse),
      indexPrefix: context.indexPrefix,
      aliases,
    });
  });

  it('calls checkVersionCompatibility with the correct parameters', () => {
    const state = createState();
    const fetchIndexResponse = createResponse();
    const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

    init(state, res, context);

    expect(checkVersionCompatibilityMock).toHaveBeenCalledTimes(1);
    expect(checkVersionCompatibilityMock).toHaveBeenCalledWith({
      mappings: fetchIndexResponse[currentIndex].mappings,
      types: ['foo', 'bar'].map((type) => context.typeRegistry.getType(type)),
      source: 'mappingVersions',
      deletedTypes: context.deletedTypes,
    });
  });

  describe('when checkIndexCurrentAlgorithm returns `unknown`', () => {
    beforeEach(() => {
      checkIndexCurrentAlgorithmMock.mockReset().mockReturnValue('unknown');
    });

    it('adds a log entry about the algo check', () => {
      const state = createState();
      const res: StateActionResponse<'INIT'> = Either.right(createResponse());

      const newState = init(state, res, context);

      expect(newState.logs.map((entry) => entry.message)).toContain(
        `INIT: current algo check result: unknown`
      );
    });

    it('INIT -> FATAL', () => {
      const state = createState();
      const fetchIndexResponse = createResponse();
      const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

      const newState = init(state, res, context);

      expect(newState).toEqual(
        expect.objectContaining({
          controlState: 'FATAL',
          reason: 'Cannot identify algorithm used for index .kibana_1',
        })
      );
    });
  });

  describe('when checkIndexCurrentAlgorithm returns `v2-incompatible`', () => {
    beforeEach(() => {
      checkIndexCurrentAlgorithmMock.mockReset().mockReturnValue('v2-incompatible');
    });

    it('adds a log entry about the algo check', () => {
      const state = createState();
      const res: StateActionResponse<'INIT'> = Either.right(createResponse());

      const newState = init(state, res, context);

      expect(newState.logs.map((entry) => entry.message)).toContain(
        `INIT: current algo check result: v2-incompatible`
      );
    });

    it('INIT -> FATAL', () => {
      const state = createState();
      const fetchIndexResponse = createResponse();
      const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

      const newState = init(state, res, context);

      expect(newState).toEqual(
        expect.objectContaining({
          controlState: 'FATAL',
          reason: 'Index .kibana_1 is using an incompatible version of the v2 algorithm',
        })
      );
    });
  });

  describe('when checkIndexCurrentAlgorithm returns `v2-compatible`', () => {
    beforeEach(() => {
      checkIndexCurrentAlgorithmMock.mockReset().mockReturnValue('v2-compatible');
      buildIndexMappingsMock.mockReturnValue({});
    });

    it('calls buildIndexMappings with the correct parameters', () => {
      const state = createState();
      const res: StateActionResponse<'INIT'> = Either.right(createResponse());

      init(state, res, context);

      expect(buildIndexMappingsMock).toHaveBeenCalledTimes(1);
      expect(buildIndexMappingsMock).toHaveBeenLastCalledWith({
        types: ['foo', 'bar'].map((type) => context.typeRegistry.getType(type)),
      });
    });

    it('adds a log entry about the algo check', () => {
      const state = createState();
      const res: StateActionResponse<'INIT'> = Either.right(createResponse());

      const newState = init(state, res, context);

      expect(newState.logs.map((entry) => entry.message)).toContain(
        `INIT: current algo check result: v2-compatible`
      );
    });

    it('INIT -> UPDATE_INDEX_MAPPINGS', () => {
      const state = createState();
      const fetchIndexResponse = createResponse();
      const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

      const mockMappings = { properties: { someMappings: 'string' } };
      buildIndexMappingsMock.mockReturnValue(mockMappings);

      const newState = init(state, res, context);

      expect(newState).toEqual(
        expect.objectContaining({
          controlState: 'UPDATE_INDEX_MAPPINGS',
          currentIndex,
          previousMappings: fetchIndexResponse[currentIndex].mappings,
          additiveMappingChanges: mockMappings.properties,
          previousAlgorithm: 'v2',
          skipDocumentMigration: false,
        })
      );
    });
  });

  describe('when checkIndexCurrentAlgorithm returns `v2-partially-migrated`', () => {
    beforeEach(() => {
      checkIndexCurrentAlgorithmMock.mockReset().mockReturnValue('v2-partially-migrated');
      buildIndexMappingsMock.mockReturnValue({});
      checkVersionCompatibilityMock.mockReturnValue({ status: 'greater' });
    });

    it('adds a log entry about the algo check', () => {
      const state = createState();
      const res: StateActionResponse<'INIT'> = Either.right(createResponse());

      const newState = init(state, res, context);

      expect(newState.logs.map((entry) => entry.message)).toContain(
        `INIT: current algo check result: v2-partially-migrated`
      );
    });

    it('INIT -> UPDATE_INDEX_MAPPINGS', () => {
      const state = createState();
      const fetchIndexResponse = createResponse();
      const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

      const mockMappings = { properties: { someMappings: 'string' } };
      buildIndexMappingsMock.mockReturnValue(mockMappings);

      const newState = init(state, res, context);

      expect(newState).toEqual(
        expect.objectContaining({
          controlState: 'UPDATE_INDEX_MAPPINGS',
          currentIndex,
          previousMappings: fetchIndexResponse[currentIndex].mappings,
          previousAlgorithm: 'v2',
        })
      );
    });
  });

  describe('when checkIndexCurrentAlgorithm returns `zdt`', () => {
    beforeEach(() => {
      checkIndexCurrentAlgorithmMock.mockReset().mockReturnValue('zdt');
    });

    it('adds a log entry about the algo check', () => {
      const state = createState();
      const res: StateActionResponse<'INIT'> = Either.right(createResponse());

      const newState = init(state, res, context);

      expect(newState.logs.map((entry) => entry.message)).toContain(
        `INIT: current algo check result: zdt`
      );
    });

    describe('when getCurrentIndex returns undefined', () => {
      beforeEach(() => {
        getCurrentIndexMock.mockReturnValue(undefined);
      });

      it('calls buildIndexMappings with the correct parameters', () => {
        const state = createState();
        const fetchIndexResponse = createResponse();
        const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

        init(state, res, context);

        expect(buildIndexMappingsMock).toHaveBeenCalledTimes(1);
        expect(buildIndexMappingsMock).toHaveBeenCalledWith({
          types: ['foo', 'bar'].map((type) => context.typeRegistry.getType(type)),
        });
      });

      it('INIT -> CREATE_TARGET_INDEX', () => {
        const state = createState();
        const fetchIndexResponse = createResponse();
        const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

        const mockMappings = { properties: { someMappings: 'string' } };
        buildIndexMappingsMock.mockReturnValue(mockMappings);

        const newState = init(state, res, context);

        expect(newState).toEqual(
          expect.objectContaining({
            controlState: 'CREATE_TARGET_INDEX',
            currentIndex: '.kibana_1',
            indexMappings: mockMappings,
          })
        );
      });
    });

    describe('when checkVersionCompatibility returns `greater`', () => {
      it('calls generateAdditiveMappingDiff with the correct parameters', () => {
        const state = createState();
        const fetchIndexResponse = createResponse();
        const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

        checkVersionCompatibilityMock.mockReturnValue({
          status: 'greater',
        });

        init(state, res, context);

        expect(generateAdditiveMappingDiffMock).toHaveBeenCalledTimes(1);
        expect(generateAdditiveMappingDiffMock).toHaveBeenCalledWith({
          types: ['foo', 'bar'].map((type) => context.typeRegistry.getType(type)),
          mapping: fetchIndexResponse[currentIndex].mappings,
          deletedTypes: context.deletedTypes,
        });
      });

      it('INIT -> UPDATE_INDEX_MAPPINGS', () => {
        const state = createState();
        const fetchIndexResponse = createResponse();
        const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

        checkVersionCompatibilityMock.mockReturnValue({
          status: 'greater',
        });
        generateAdditiveMappingDiffMock.mockReturnValue({ someToken: {} });

        const newState = init(state, res, context);

        expect(newState).toEqual(
          expect.objectContaining({
            controlState: 'UPDATE_INDEX_MAPPINGS',
            currentIndex,
            previousMappings: fetchIndexResponse[currentIndex].mappings,
            additiveMappingChanges: { someToken: {} },
            skipDocumentMigration: false,
            previousAlgorithm: 'zdt',
          })
        );
      });

      it('adds a log entry about the version check', () => {
        const state = createState();
        const res: StateActionResponse<'INIT'> = Either.right(createResponse());

        checkVersionCompatibilityMock.mockReturnValue({
          status: 'greater',
        });

        const newState = init(state, res, context);

        expect(newState.logs.map((entry) => entry.message)).toContain(
          `INIT: mapping version check result: greater`
        );
      });
    });

    describe('when checkVersionCompatibility returns `equal`', () => {
      it('INIT -> UPDATE_ALIASES if alias actions are not empty', () => {
        const state = createState();
        const fetchIndexResponse = createResponse();
        const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

        checkVersionCompatibilityMock.mockReturnValue({
          status: 'equal',
        });
        getAliasActionsMock.mockReturnValue([{ add: { index: '.kibana_1', alias: '.kibana' } }]);

        const newState = init(state, res, context);

        expect(newState).toEqual(
          expect.objectContaining({
            controlState: 'UPDATE_ALIASES',
            currentIndex,
            previousMappings: fetchIndexResponse[currentIndex].mappings,
            skipDocumentMigration: false,
            previousAlgorithm: 'zdt',
          })
        );
      });

      it('INIT -> INDEX_STATE_UPDATE_DONE if alias actions are empty', () => {
        const state = createState();
        const fetchIndexResponse = createResponse();
        const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

        checkVersionCompatibilityMock.mockReturnValue({
          status: 'equal',
        });
        getAliasActionsMock.mockReturnValue([]);

        const newState = init(state, res, context);

        expect(newState).toEqual(
          expect.objectContaining({
            controlState: 'INDEX_STATE_UPDATE_DONE',
            currentIndex,
            previousMappings: fetchIndexResponse[currentIndex].mappings,
            skipDocumentMigration: false,
            previousAlgorithm: 'zdt',
          })
        );
      });

      it('adds a log entry about the version check', () => {
        const state = createState();
        const res: StateActionResponse<'INIT'> = Either.right(createResponse());

        checkVersionCompatibilityMock.mockReturnValue({
          status: 'equal',
        });

        const newState = init(state, res, context);

        expect(newState.logs.map((entry) => entry.message)).toContain(
          `INIT: mapping version check result: equal`
        );
      });
    });

    describe('when checkVersionCompatibility returns `lesser`', () => {
      it('INIT -> INDEX_STATE_UPDATE_DONE', () => {
        const state = createState();
        const fetchIndexResponse = createResponse();
        const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

        checkVersionCompatibilityMock.mockReturnValue({
          status: 'lesser',
        });

        const newState = init(state, res, context);

        expect(newState).toEqual(
          expect.objectContaining({
            controlState: 'INDEX_STATE_UPDATE_DONE',
          })
        );
      });

      it('adds a log entry about the version check', () => {
        const state = createState();
        const res: StateActionResponse<'INIT'> = Either.right(createResponse());

        checkVersionCompatibilityMock.mockReturnValue({
          status: 'lesser',
        });

        const newState = init(state, res, context);

        expect(newState.logs.map((entry) => entry.message)).toContain(
          `INIT: mapping version check result: lesser`
        );
      });
    });

    describe('when checkVersionCompatibility returns `conflict`', () => {
      it('INIT -> FATAL', () => {
        const state = createState();
        const fetchIndexResponse = createResponse();
        const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

        checkVersionCompatibilityMock.mockReturnValue({
          status: 'conflict',
        });

        const newState = init(state, res, context);

        expect(newState).toEqual(
          expect.objectContaining({
            controlState: 'FATAL',
            reason: 'Model version conflict: inconsistent higher/lower versions',
          })
        );
      });

      it('adds a log entry about the version check', () => {
        const state = createState();
        const res: StateActionResponse<'INIT'> = Either.right(createResponse());

        checkVersionCompatibilityMock.mockReturnValue({
          status: 'conflict',
        });

        const newState = init(state, res, context);

        expect(newState.logs.map((entry) => entry.message)).toContain(
          `INIT: mapping version check result: conflict`
        );
      });
    });
  });
});
