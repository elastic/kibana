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
import { PlainIndexDataClientBundle } from './plain_index/plain_index_data_client_bundle';
import { createMockStepDataClient, createMockWorkflowDataClient } from '../mocks';

jest.mock('./plain_index/plain_index_data_client_bundle');

const MockBundle = PlainIndexDataClientBundle as jest.MockedClass<
  typeof PlainIndexDataClientBundle
>;

describe('DeferredDataClientBundle', () => {
  let innerBundle: {
    initSetup: jest.Mock;
    initStart: jest.Mock;
    stop: jest.Mock;
    createWorkflowDataClient: jest.Mock;
    createStepDataClient: jest.Mock;
  };
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let bundle: DeferredDataClientBundle;

  beforeEach(() => {
    innerBundle = {
      initSetup: jest.fn().mockResolvedValue(undefined),
      initStart: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      createWorkflowDataClient: jest.fn().mockReturnValue(createMockWorkflowDataClient()),
      createStepDataClient: jest.fn().mockReturnValue(createMockStepDataClient()),
    };

    MockBundle.mockImplementation(() => innerBundle as unknown as PlainIndexDataClientBundle);

    coreSetup = coreMock.createSetup();
    coreStart = coreMock.createStart();

    bundle = new DeferredDataClientBundle({ source: 'system_index', logger: loggerMock.create() });
  });

  describe('initSetup', () => {
    it('delegates to the inner bundle', async () => {
      await bundle.initSetup(coreSetup);
      expect(innerBundle.initSetup).toHaveBeenCalledWith(coreSetup);
    });

    it('is idempotent — inner initSetup called only once', async () => {
      await bundle.initSetup(coreSetup);
      await bundle.initSetup(coreSetup);
      expect(innerBundle.initSetup).toHaveBeenCalledTimes(1);
    });
  });

  describe('initStart', () => {
    it('throws synchronously if initSetup was not called first', () => {
      expect(() => bundle.initStart(coreStart)).toThrow('initSetup must be called first');
    });

    it('is idempotent — inner initStart called only once', async () => {
      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);
      await bundle.initStart(coreStart);
      expect(innerBundle.initStart).toHaveBeenCalledTimes(1);
    });

    it('chains inner initStart only after setupPromise resolves', async () => {
      let resolveSetup!: () => void;
      innerBundle.initSetup.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSetup = resolve;
        })
      );

      void bundle.initSetup(coreSetup);
      const startPromise = bundle.initStart(coreStart);

      expect(innerBundle.initStart).not.toHaveBeenCalled();

      resolveSetup();
      await startPromise;

      expect(innerBundle.initStart).toHaveBeenCalledWith(coreStart);
    });
  });

  describe('stop', () => {
    it('delegates to the inner bundle', async () => {
      await bundle.stop();
      expect(innerBundle.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('createWorkflowDataClient', () => {
    it('throws if called before initStart', async () => {
      await bundle.initSetup(coreSetup);
      expect(() => bundle.createWorkflowDataClient()).toThrow(
        'initStart must be called before creating data clients'
      );
    });

    it('returns the same singleton instance on repeated calls', async () => {
      await bundle.initSetup(coreSetup);
      void bundle.initStart(coreStart);

      expect(bundle.createWorkflowDataClient()).toBe(bundle.createWorkflowDataClient());
    });

    it('queues operations until initStart completes', async () => {
      let resolveSetup!: () => void;
      innerBundle.initSetup.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSetup = resolve;
        })
      );

      const innerClient = createMockWorkflowDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      innerBundle.createWorkflowDataClient.mockReturnValue(innerClient);

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
      innerBundle.createWorkflowDataClient.mockReturnValue(innerClient);

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);

      const client = bundle.createWorkflowDataClient();
      await client.search({ query: { match_all: {} } });
      await client.search({ query: { match_all: {} } });

      expect(innerBundle.createWorkflowDataClient).toHaveBeenCalledTimes(1);
    });

    it('delegates all methods to the inner client', async () => {
      const innerClient = createMockWorkflowDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      innerClient.count.mockResolvedValue({ count: 3 } as never);
      innerClient.bulk.mockResolvedValue({ items: [], errors: false });
      innerBundle.createWorkflowDataClient.mockReturnValue(innerClient);

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

    it('returns the same singleton instance on repeated calls', async () => {
      await bundle.initSetup(coreSetup);
      void bundle.initStart(coreStart);

      expect(bundle.createStepDataClient()).toBe(bundle.createStepDataClient());
    });

    it('queues operations until initStart completes', async () => {
      let resolveSetup!: () => void;
      innerBundle.initSetup.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSetup = resolve;
        })
      );

      const innerClient = createMockStepDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      innerBundle.createStepDataClient.mockReturnValue(innerClient);

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
