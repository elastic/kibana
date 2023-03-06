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
    ...parts,
  });

  const createResponse = (): FetchIndexResponse => ({
    [currentIndex]: {
      aliases: {},
      mappings: {
        properties: {},
        _meta: { mappingVersions: { foo: 1, bar: 1 } },
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

  it('loops to INIT when cluster routing allocation is incompatible', () => {
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

    init(state, res, context);

    expect(getCurrentIndexMock).toHaveBeenCalledTimes(1);
    expect(getCurrentIndexMock).toHaveBeenCalledWith(fetchIndexResponse, context.indexPrefix);
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

    it('forwards to CREATE_TARGET_INDEX', () => {
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
        meta: fetchIndexResponse[currentIndex].mappings._meta,
        deletedTypes: context.deletedTypes,
      });
    });

    it('forwards to UPDATE_INDEX_MAPPINGS', () => {
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

      expect(newState.logs.map((entry) => entry.message)).toEqual([
        `Mappings model version check result: greater`,
      ]);
    });
  });

  describe('when checkVersionCompatibility returns `equal`', () => {
    it('forwards to UPDATE_ALIASES', () => {
      const state = createState();
      const fetchIndexResponse = createResponse();
      const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

      checkVersionCompatibilityMock.mockReturnValue({
        status: 'equal',
      });

      const newState = init(state, res, context);

      expect(newState).toEqual(
        expect.objectContaining({
          controlState: 'UPDATE_ALIASES',
          currentIndex,
          previousMappings: fetchIndexResponse[currentIndex].mappings,
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

      expect(newState.logs.map((entry) => entry.message)).toEqual([
        `Mappings model version check result: equal`,
      ]);
    });
  });

  describe('when checkVersionCompatibility returns `lesser`', () => {
    it('forwards to FATAL', () => {
      const state = createState();
      const fetchIndexResponse = createResponse();
      const res: StateActionResponse<'INIT'> = Either.right(fetchIndexResponse);

      checkVersionCompatibilityMock.mockReturnValue({
        status: 'lesser',
      });

      const newState = init(state, res, context);

      expect(newState).toEqual(
        expect.objectContaining({
          controlState: 'FATAL',
          reason: 'Downgrading model version is currently unsupported',
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

      expect(newState.logs.map((entry) => entry.message)).toEqual([
        `Mappings model version check result: lesser`,
      ]);
    });
  });

  describe('when checkVersionCompatibility returns `conflict`', () => {
    it('forwards to FATAL', () => {
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

      expect(newState.logs.map((entry) => entry.message)).toEqual([
        `Mappings model version check result: conflict`,
      ]);
    });
  });
});
