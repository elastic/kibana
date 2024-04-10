/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import {
  CORE_USAGE_STATS_TYPE,
  CORE_USAGE_STATS_ID,
  BaseIncrementOptions,
  IncrementSavedObjectsImportOptions,
  IncrementSavedObjectsResolveImportErrorsOptions,
  IncrementSavedObjectsExportOptions,
} from '@kbn/core-usage-data-base-server-internal';
import {
  BULK_CREATE_STATS_PREFIX,
  BULK_GET_STATS_PREFIX,
  BULK_UPDATE_STATS_PREFIX,
  BULK_DELETE_STATS_PREFIX,
  CREATE_STATS_PREFIX,
  DELETE_STATS_PREFIX,
  FIND_STATS_PREFIX,
  GET_STATS_PREFIX,
  RESOLVE_STATS_PREFIX,
  UPDATE_STATS_PREFIX,
  IMPORT_STATS_PREFIX,
  RESOLVE_IMPORT_STATS_PREFIX,
  EXPORT_STATS_PREFIX,
  LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX,
  LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX,
  BULK_RESOLVE_STATS_PREFIX,
} from './core_usage_stats_client';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { CoreUsageStatsClient } from '.';

describe('CoreUsageStatsClient', () => {
  const stop$ = new Subject<void>();
  const setup = (namespace?: string) => {
    const debugLoggerMock = jest.fn();
    const basePathMock = httpServiceMock.createBasePath();
    // we could mock a return value for basePathMock.get, but it isn't necessary for testing purposes
    basePathMock.remove.mockReturnValue(namespace ? `/s/${namespace}` : '/');
    const repositoryMock = savedObjectsRepositoryMock.create();
    const usageStatsClient = new CoreUsageStatsClient(
      debugLoggerMock,
      basePathMock,
      Promise.resolve(repositoryMock),
      stop$
    );
    return { usageStatsClient, debugLoggerMock, basePathMock, repositoryMock };
  };
  const firstPartyRequestHeaders = {
    'kbn-version': 'a',
    referer: 'b',
    'x-elastic-internal-origin': 'c',
  }; // as long as these header fields are truthy, this will be treated like a first-party request
  const incrementOptions = { refresh: false };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    stop$.next();
  });

  describe('Request-batching', () => {
    it.each([
      { triggerName: 'timer-based', triggerFn: async () => await jest.runOnlyPendingTimersAsync() },
      {
        triggerName: 'forced-flush',
        triggerFn: (usageStatsClient: CoreUsageStatsClient) => {
          // eslint-disable-next-line dot-notation
          usageStatsClient['flush$'].next();
        },
      },
    ])('batches multiple increments into one ($triggerName)', async ({ triggerFn }) => {
      const { usageStatsClient, repositoryMock } = setup();

      // First request
      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkCreate({
        request,
      } as BaseIncrementOptions);

      // Second request
      const kibanaRequest = httpServerMock.createKibanaRequest({
        headers: firstPartyRequestHeaders,
      });
      await usageStatsClient.incrementSavedObjectsBulkCreate({
        request: kibanaRequest,
      } as BaseIncrementOptions);

      // Run trigger
      await triggerFn(usageStatsClient);

      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_CREATE_STATS_PREFIX}.total`, incrementBy: 2 },
          { fieldName: `${BULK_CREATE_STATS_PREFIX}.namespace.default.total`, incrementBy: 2 },
          {
            fieldName: `${BULK_CREATE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
          {
            fieldName: `${BULK_CREATE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('triggers when the queue is too large', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      // Trigger enough requests to overflow the queue
      const request = httpServerMock.createKibanaRequest();
      await Promise.all(
        [...new Array(10_001).keys()].map(() =>
          usageStatsClient.incrementSavedObjectsBulkCreate({
            request,
          } as BaseIncrementOptions)
        )
      );

      // It sends all elements in the max batch
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenNthCalledWith(
        1,
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_CREATE_STATS_PREFIX}.total`, incrementBy: 10_000 },
          { fieldName: `${BULK_CREATE_STATS_PREFIX}.namespace.default.total`, incrementBy: 10_000 },
          {
            fieldName: `${BULK_CREATE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 10_000,
          },
        ],
        incrementOptions
      );

      // After timer, it sends the remainder event
      await jest.runOnlyPendingTimersAsync();

      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(2);
      expect(repositoryMock.incrementCounter).toHaveBeenNthCalledWith(
        2,
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_CREATE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_CREATE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_CREATE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });
  });

  describe('#getUsageStats', () => {
    it('returns empty object when encountering a repository error', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.get.mockRejectedValue(new Error('Oh no!'));

      const result = await usageStatsClient.getUsageStats();
      expect(result).toEqual({});
    });

    it('returns object attributes when usage stats exist', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      const usageStats = { foo: 'bar' };
      repositoryMock.incrementCounter.mockResolvedValue({
        type: CORE_USAGE_STATS_TYPE,
        id: CORE_USAGE_STATS_ID,
        attributes: usageStats,
        references: [],
      });

      const result = await usageStatsClient.getUsageStats();
      expect(result).toEqual(usageStats);
    });
  });

  describe('#incrementSavedObjectsBulkCreate', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsBulkCreate({
          request,
        } as BaseIncrementOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkCreate({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_CREATE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_CREATE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_CREATE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsBulkCreate({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_CREATE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_CREATE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_CREATE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkCreate({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_CREATE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_CREATE_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_CREATE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsBulkGet', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsBulkGet({
          request,
        } as BaseIncrementOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkGet({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_GET_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_GET_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_GET_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsBulkGet({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_GET_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_GET_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_GET_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkGet({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_GET_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_GET_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_GET_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsBulkResolve', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsBulkResolve({
          request,
        } as BaseIncrementOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkResolve({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_RESOLVE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_RESOLVE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_RESOLVE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsBulkResolve({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_RESOLVE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_RESOLVE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_RESOLVE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkResolve({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_RESOLVE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_RESOLVE_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_RESOLVE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsBulkUpdate', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsBulkUpdate({
          request,
        } as BaseIncrementOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkUpdate({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_UPDATE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_UPDATE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_UPDATE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsBulkUpdate({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_UPDATE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_UPDATE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_UPDATE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkUpdate({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_UPDATE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_UPDATE_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_UPDATE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsCreate', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsCreate({
          request,
        } as BaseIncrementOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsCreate({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${CREATE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${CREATE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${CREATE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsCreate({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${CREATE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${CREATE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${CREATE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsCreate({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${CREATE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${CREATE_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          { fieldName: `${CREATE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsBulkDelete', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsBulkDelete({
          request,
        } as BaseIncrementOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkDelete({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_DELETE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_DELETE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_DELETE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsBulkDelete({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_DELETE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_DELETE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_DELETE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkDelete({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${BULK_DELETE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${BULK_DELETE_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          {
            fieldName: `${BULK_DELETE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsDelete', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsDelete({
          request,
        } as BaseIncrementOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsDelete({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${DELETE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${DELETE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${DELETE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsDelete({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${DELETE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${DELETE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${DELETE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsDelete({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${DELETE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${DELETE_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          { fieldName: `${DELETE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsFind', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsFind({
          request,
        } as BaseIncrementOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsFind({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${FIND_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${FIND_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          { fieldName: `${FIND_STATS_PREFIX}.namespace.default.kibanaRequest.no`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsFind({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${FIND_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${FIND_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          { fieldName: `${FIND_STATS_PREFIX}.namespace.default.kibanaRequest.yes`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsFind({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${FIND_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${FIND_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          { fieldName: `${FIND_STATS_PREFIX}.namespace.custom.kibanaRequest.no`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsGet', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsGet({
          request,
        } as BaseIncrementOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsGet({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${GET_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${GET_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          { fieldName: `${GET_STATS_PREFIX}.namespace.default.kibanaRequest.no`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsGet({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${GET_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${GET_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          { fieldName: `${GET_STATS_PREFIX}.namespace.default.kibanaRequest.yes`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsGet({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${GET_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${GET_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          { fieldName: `${GET_STATS_PREFIX}.namespace.custom.kibanaRequest.no`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsResolve', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsResolve({
          request,
        } as BaseIncrementOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsResolve({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${RESOLVE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${RESOLVE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${RESOLVE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsResolve({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${RESOLVE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${RESOLVE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${RESOLVE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsResolve({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${RESOLVE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${RESOLVE_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          {
            fieldName: `${RESOLVE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsUpdate', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsUpdate({
          request,
        } as BaseIncrementOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsUpdate({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${UPDATE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${UPDATE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${UPDATE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsUpdate({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${UPDATE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${UPDATE_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${UPDATE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsUpdate({
        request,
      } as BaseIncrementOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${UPDATE_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${UPDATE_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          { fieldName: `${UPDATE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsImport', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsImport({
          request,
        } as IncrementSavedObjectsImportOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsImport({
        request,
      } as IncrementSavedObjectsImportOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${IMPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${IMPORT_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
          { fieldName: `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`, incrementBy: 1 },
          { fieldName: `${IMPORT_STATS_PREFIX}.overwriteEnabled.no`, incrementBy: 1 },
          { fieldName: `${IMPORT_STATS_PREFIX}.compatibilityModeEnabled.no`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsImport({
        request,
        createNewCopies: true,
        overwrite: true,
        compatibilityMode: true,
      } as IncrementSavedObjectsImportOptions);
      await jest.runOnlyPendingTimersAsync();
      await usageStatsClient.incrementSavedObjectsImport({
        request,
        createNewCopies: false,
        overwrite: true,
        compatibilityMode: true,
      } as IncrementSavedObjectsImportOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(2);
      expect(repositoryMock.incrementCounter).toHaveBeenNthCalledWith(
        1,
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${IMPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${IMPORT_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
          { fieldName: `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.yes`, incrementBy: 1 },
          // excludes 'overwriteEnabled.yes', 'overwriteEnabled.no', 'compatibilityModeEnabled.yes`, and
          // `compatibilityModeEnabled.no` when createNewCopies is true
        ],
        incrementOptions
      );
      expect(repositoryMock.incrementCounter).toHaveBeenNthCalledWith(
        2,
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${IMPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${IMPORT_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
          { fieldName: `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`, incrementBy: 1 },
          { fieldName: `${IMPORT_STATS_PREFIX}.overwriteEnabled.yes`, incrementBy: 1 },
          { fieldName: `${IMPORT_STATS_PREFIX}.compatibilityModeEnabled.yes`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsImport({
        request,
      } as IncrementSavedObjectsImportOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${IMPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${IMPORT_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          { fieldName: `${IMPORT_STATS_PREFIX}.namespace.custom.kibanaRequest.no`, incrementBy: 1 },
          { fieldName: `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`, incrementBy: 1 },
          { fieldName: `${IMPORT_STATS_PREFIX}.overwriteEnabled.no`, incrementBy: 1 },
          { fieldName: `${IMPORT_STATS_PREFIX}.compatibilityModeEnabled.no`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsResolveImportErrors', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsResolveImportErrors({
          request,
        } as IncrementSavedObjectsResolveImportErrorsOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsResolveImportErrors({
        request,
      } as IncrementSavedObjectsResolveImportErrorsOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
          { fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`, incrementBy: 1 },
          {
            fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.compatibilityModeEnabled.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsResolveImportErrors({
        request,
        createNewCopies: true,
        compatibilityMode: true,
      } as IncrementSavedObjectsResolveImportErrorsOptions);
      await jest.runOnlyPendingTimersAsync();
      await usageStatsClient.incrementSavedObjectsResolveImportErrors({
        request,
        createNewCopies: false,
        compatibilityMode: true,
      } as IncrementSavedObjectsResolveImportErrorsOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(2);
      expect(repositoryMock.incrementCounter).toHaveBeenNthCalledWith(
        1,
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
          {
            fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.yes`,
            incrementBy: 1,
          },
          // excludes 'compatibilityModeEnabled.yes` and `compatibilityModeEnabled.no` when createNewCopies is true
        ],
        incrementOptions
      );
      expect(repositoryMock.incrementCounter).toHaveBeenNthCalledWith(
        2,
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
          { fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`, incrementBy: 1 },
          {
            fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.compatibilityModeEnabled.yes`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsResolveImportErrors({
        request,
      } as IncrementSavedObjectsResolveImportErrorsOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          {
            fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
            incrementBy: 1,
          },
          { fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`, incrementBy: 1 },
          {
            fieldName: `${RESOLVE_IMPORT_STATS_PREFIX}.compatibilityModeEnabled.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsExport', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementSavedObjectsExport({
          request,
        } as IncrementSavedObjectsExportOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsExport({
        request,
        types: undefined,
        supportedTypes: ['foo', 'bar'],
      } as IncrementSavedObjectsExportOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${EXPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${EXPORT_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${EXPORT_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
            incrementBy: 1,
          },
          { fieldName: `${EXPORT_STATS_PREFIX}.allTypesSelected.no`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });

    it('handles truthy options and the default namespace string appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementSavedObjectsExport({
        request,
        types: ['foo', 'bar'],
        supportedTypes: ['foo', 'bar'],
      } as IncrementSavedObjectsExportOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${EXPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${EXPORT_STATS_PREFIX}.namespace.default.total`, incrementBy: 1 },
          {
            fieldName: `${EXPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
          { fieldName: `${EXPORT_STATS_PREFIX}.allTypesSelected.yes`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsExport({
        request,
      } as IncrementSavedObjectsExportOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${EXPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          { fieldName: `${EXPORT_STATS_PREFIX}.namespace.custom.total`, incrementBy: 1 },
          { fieldName: `${EXPORT_STATS_PREFIX}.namespace.custom.kibanaRequest.no`, incrementBy: 1 },
          { fieldName: `${EXPORT_STATS_PREFIX}.allTypesSelected.no`, incrementBy: 1 },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementLegacyDashboardsImport', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementLegacyDashboardsImport({
          request,
        } as IncrementSavedObjectsExportOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles the default namespace string and first party request appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementLegacyDashboardsImport({
        request,
      } as IncrementSavedObjectsExportOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          {
            fieldName: `${LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX}.namespace.default.total`,
            incrementBy: 1,
          },
          {
            fieldName: `${LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space and and third party request appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementLegacyDashboardsImport({
        request,
      } as IncrementSavedObjectsExportOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          {
            fieldName: `${LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX}.namespace.custom.total`,
            incrementBy: 1,
          },
          {
            fieldName: `${LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementLegacyDashboardsExport', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      const request = httpServerMock.createKibanaRequest();
      await expect(
        usageStatsClient.incrementLegacyDashboardsExport({
          request,
        } as IncrementSavedObjectsExportOptions)
      ).resolves.toBeUndefined();
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles the default namespace string and first party request appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementLegacyDashboardsExport({
        request,
      } as IncrementSavedObjectsExportOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          {
            fieldName: `${LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX}.namespace.default.total`,
            incrementBy: 1,
          },
          {
            fieldName: `${LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });

    it('handles a non-default space and and third party request appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup('foo');

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementLegacyDashboardsExport({
        request,
      } as IncrementSavedObjectsExportOptions);
      await jest.runOnlyPendingTimersAsync();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          { fieldName: `${LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX}.total`, incrementBy: 1 },
          {
            fieldName: `${LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX}.namespace.custom.total`,
            incrementBy: 1,
          },
          {
            fieldName: `${LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
            incrementBy: 1,
          },
        ],
        incrementOptions
      );
    });
  });
});
