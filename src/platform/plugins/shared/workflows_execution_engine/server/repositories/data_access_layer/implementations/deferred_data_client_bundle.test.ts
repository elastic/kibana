/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { DeferredDataClientBundle } from './deferred_data_client_bundle';
import { PlainIndexEntityDataClient } from './plain_index/plain_index_entity_data_client';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../constants/execution_indexes';
import { createMockStepDataClient, createMockWorkflowDataClient } from '../mocks';

jest.mock('./plain_index/plain_index_entity_data_client');

interface EntityMock {
  initSetup: jest.Mock;
  initStart: jest.Mock;
  stop: jest.Mock;
  createClient: jest.Mock;
}

const mockPlain = PlainIndexEntityDataClient as unknown as jest.Mock<
  EntityMock,
  [{ indexName: string }]
>;

const createEntity = (): EntityMock => ({
  initSetup: jest.fn().mockResolvedValue(undefined),
  initStart: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  createClient: jest.fn().mockReturnValue(createMockWorkflowDataClient()),
});

describe('DeferredDataClientBundle', () => {
  let plainWorkflow: EntityMock;
  let plainStep: EntityMock;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let bundle: DeferredDataClientBundle;

  beforeEach(() => {
    plainWorkflow = createEntity();
    plainStep = createEntity();
    plainStep.createClient.mockReturnValue(createMockStepDataClient());
    mockPlain.mockImplementation((deps) =>
      deps.indexName === WORKFLOWS_STEP_EXECUTIONS_INDEX ? plainStep : plainWorkflow
    );

    coreSetup = coreMock.createSetup();
    coreStart = coreMock.createStart();

    bundle = new DeferredDataClientBundle({
      source: 'plain_index',
      dataRetention: '90d',
      logger: loggerMock.create(),
    });
  });

  describe('initSetup', () => {
    it('sets up the workflow and step clients', async () => {
      await bundle.initSetup(coreSetup);

      expect(plainWorkflow.initSetup).toHaveBeenCalledWith(coreSetup);
      expect(plainStep.initSetup).toHaveBeenCalledWith(coreSetup);
    });

    it('is idempotent — each entity is set up only once', async () => {
      await bundle.initSetup(coreSetup);
      await bundle.initSetup(coreSetup);

      expect(plainWorkflow.initSetup).toHaveBeenCalledTimes(1);
      expect(plainStep.initSetup).toHaveBeenCalledTimes(1);
    });
  });

  describe('initStart', () => {
    it('throws synchronously if initSetup was not called first', () => {
      expect(() => bundle.initStart(coreStart)).toThrow('initSetup must be called first');
    });

    it('is idempotent — each entity starts only once', async () => {
      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);
      await bundle.initStart(coreStart);

      expect(plainWorkflow.initStart).toHaveBeenCalledTimes(1);
      expect(plainStep.initStart).toHaveBeenCalledTimes(1);
    });

    it('chains initStart only after setup resolves', async () => {
      let resolveSetup!: () => void;
      plainWorkflow.initSetup.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSetup = resolve;
        })
      );

      void bundle.initSetup(coreSetup);
      const startPromise = bundle.initStart(coreStart);

      expect(plainWorkflow.initStart).not.toHaveBeenCalled();
      expect(plainStep.initStart).not.toHaveBeenCalled();

      resolveSetup();
      await startPromise;

      expect(plainWorkflow.initStart).toHaveBeenCalledWith(coreStart);
      expect(plainStep.initStart).toHaveBeenCalledWith(coreStart);
    });
  });

  describe('stop', () => {
    it('stops the workflow and step clients', async () => {
      await bundle.stop();

      expect(plainWorkflow.stop).toHaveBeenCalledTimes(1);
      expect(plainStep.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('createWorkflowDataClient', () => {
    it('throws if called before initStart', async () => {
      await bundle.initSetup(coreSetup);
      expect(() => bundle.createWorkflowDataClient()).toThrow(
        'initStart must be called before creating data clients'
      );
    });

    it('returns a new instance on each call so version cache is not shared across executions', async () => {
      await bundle.initSetup(coreSetup);
      void bundle.initStart(coreStart);

      expect(bundle.createWorkflowDataClient()).not.toBe(bundle.createWorkflowDataClient());
    });

    it('queues operations until initStart completes', async () => {
      let resolveSetup!: () => void;
      plainWorkflow.initSetup.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSetup = resolve;
        })
      );

      const innerClient = createMockWorkflowDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      plainWorkflow.createClient.mockReturnValue(innerClient);

      void bundle.initSetup(coreSetup);
      void bundle.initStart(coreStart);

      const client = bundle.createWorkflowDataClient();
      const searchPromise = client.search({ query: { match_all: {} } });

      expect(innerClient.search).not.toHaveBeenCalled();

      resolveSetup();
      await searchPromise;

      expect(innerClient.search).toHaveBeenCalledWith({ query: { match_all: {} } });
    });

    it('creates the inner client only once regardless of how many operations run', async () => {
      const innerClient = createMockWorkflowDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      plainWorkflow.createClient.mockReturnValue(innerClient);

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);

      const client = bundle.createWorkflowDataClient();
      await client.search({ query: { match_all: {} } });
      await client.search({ query: { match_all: {} } });

      expect(plainWorkflow.createClient).toHaveBeenCalledTimes(1);
    });

    it('creates a distinct inner client for each returned instance', async () => {
      plainWorkflow.createClient
        .mockReturnValueOnce(createMockWorkflowDataClient())
        .mockReturnValueOnce(createMockWorkflowDataClient());

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);

      const first = bundle.createWorkflowDataClient();
      const second = bundle.createWorkflowDataClient();
      await first.search({ query: { match_all: {} } });
      await second.search({ query: { match_all: {} } });

      expect(plainWorkflow.createClient).toHaveBeenCalledTimes(2);
    });

    it('delegates all methods to the inner client', async () => {
      const innerClient = createMockWorkflowDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      innerClient.count.mockResolvedValue({ count: 3 } as never);
      innerClient.bulk.mockResolvedValue({ items: [], errors: false });
      plainWorkflow.createClient.mockReturnValue(innerClient);

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);

      const client = bundle.createWorkflowDataClient();

      await client.search({ query: { match_all: {} } });
      await client.count({ query: { match_all: {} } });
      await client.bulk({ items: [] });

      expect(innerClient.search).toHaveBeenCalledWith({ query: { match_all: {} } });
      expect(innerClient.count).toHaveBeenCalledWith({ query: { match_all: {} } });
      expect(innerClient.bulk).toHaveBeenCalledWith({ items: [] });
    });
  });

  describe('createStepDataClient', () => {
    it('throws if called before initStart', async () => {
      await bundle.initSetup(coreSetup);
      expect(() => bundle.createStepDataClient()).toThrow(
        'initStart must be called before creating data clients'
      );
    });

    it('returns a new instance on each call so version cache is not shared across executions', async () => {
      await bundle.initSetup(coreSetup);
      void bundle.initStart(coreStart);

      expect(bundle.createStepDataClient()).not.toBe(bundle.createStepDataClient());
    });

    it('queues operations until initStart completes', async () => {
      let resolveSetup!: () => void;
      plainStep.initSetup.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSetup = resolve;
        })
      );

      const innerClient = createMockStepDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      plainStep.createClient.mockReturnValue(innerClient);

      void bundle.initSetup(coreSetup);
      void bundle.initStart(coreStart);

      const client = bundle.createStepDataClient();
      const searchPromise = client.search({ query: { match_all: {} } });

      expect(innerClient.search).not.toHaveBeenCalled();

      resolveSetup();
      await searchPromise;

      expect(innerClient.search).toHaveBeenCalledWith({ query: { match_all: {} } });
    });
  });
});
