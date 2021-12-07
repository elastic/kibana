/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServerMock, httpServiceMock, savedObjectsRepositoryMock } from '../mocks';
import { CORE_USAGE_STATS_TYPE, CORE_USAGE_STATS_ID } from './constants';
import {
  BaseIncrementOptions,
  IncrementSavedObjectsImportOptions,
  IncrementSavedObjectsResolveImportErrorsOptions,
  IncrementSavedObjectsExportOptions,
  BULK_CREATE_STATS_PREFIX,
  BULK_GET_STATS_PREFIX,
  BULK_UPDATE_STATS_PREFIX,
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
import { CoreUsageStatsClient } from '.';
import { DEFAULT_NAMESPACE_STRING } from '../saved_objects/service/lib/utils';

describe('CoreUsageStatsClient', () => {
  const setup = (namespace?: string) => {
    const debugLoggerMock = jest.fn();
    const basePathMock = httpServiceMock.createBasePath();
    // we could mock a return value for basePathMock.get, but it isn't necessary for testing purposes
    basePathMock.remove.mockReturnValue(namespace ? `/s/${namespace}` : '/');
    const repositoryMock = savedObjectsRepositoryMock.create();
    const usageStatsClient = new CoreUsageStatsClient(
      debugLoggerMock,
      basePathMock,
      Promise.resolve(repositoryMock)
    );
    return { usageStatsClient, debugLoggerMock, basePathMock, repositoryMock };
  };
  const firstPartyRequestHeaders = { 'kbn-version': 'a', referer: 'b' }; // as long as these two header fields are truthy, this will be treated like a first-party request
  const incrementOptions = { refresh: false };

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
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkCreate({
        request,
      } as BaseIncrementOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${BULK_CREATE_STATS_PREFIX}.total`,
          `${BULK_CREATE_STATS_PREFIX}.namespace.default.total`,
          `${BULK_CREATE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${BULK_CREATE_STATS_PREFIX}.total`,
          `${BULK_CREATE_STATS_PREFIX}.namespace.default.total`,
          `${BULK_CREATE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${BULK_CREATE_STATS_PREFIX}.total`,
          `${BULK_CREATE_STATS_PREFIX}.namespace.custom.total`,
          `${BULK_CREATE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkGet({
        request,
      } as BaseIncrementOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${BULK_GET_STATS_PREFIX}.total`,
          `${BULK_GET_STATS_PREFIX}.namespace.default.total`,
          `${BULK_GET_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${BULK_GET_STATS_PREFIX}.total`,
          `${BULK_GET_STATS_PREFIX}.namespace.default.total`,
          `${BULK_GET_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${BULK_GET_STATS_PREFIX}.total`,
          `${BULK_GET_STATS_PREFIX}.namespace.custom.total`,
          `${BULK_GET_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkResolve({
        request,
      } as BaseIncrementOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${BULK_RESOLVE_STATS_PREFIX}.total`,
          `${BULK_RESOLVE_STATS_PREFIX}.namespace.default.total`,
          `${BULK_RESOLVE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${BULK_RESOLVE_STATS_PREFIX}.total`,
          `${BULK_RESOLVE_STATS_PREFIX}.namespace.default.total`,
          `${BULK_RESOLVE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${BULK_RESOLVE_STATS_PREFIX}.total`,
          `${BULK_RESOLVE_STATS_PREFIX}.namespace.custom.total`,
          `${BULK_RESOLVE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsBulkUpdate({
        request,
      } as BaseIncrementOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${BULK_UPDATE_STATS_PREFIX}.total`,
          `${BULK_UPDATE_STATS_PREFIX}.namespace.default.total`,
          `${BULK_UPDATE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${BULK_UPDATE_STATS_PREFIX}.total`,
          `${BULK_UPDATE_STATS_PREFIX}.namespace.default.total`,
          `${BULK_UPDATE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${BULK_UPDATE_STATS_PREFIX}.total`,
          `${BULK_UPDATE_STATS_PREFIX}.namespace.custom.total`,
          `${BULK_UPDATE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsCreate({
        request,
      } as BaseIncrementOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${CREATE_STATS_PREFIX}.total`,
          `${CREATE_STATS_PREFIX}.namespace.default.total`,
          `${CREATE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${CREATE_STATS_PREFIX}.total`,
          `${CREATE_STATS_PREFIX}.namespace.default.total`,
          `${CREATE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${CREATE_STATS_PREFIX}.total`,
          `${CREATE_STATS_PREFIX}.namespace.custom.total`,
          `${CREATE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsDelete({
        request,
      } as BaseIncrementOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${DELETE_STATS_PREFIX}.total`,
          `${DELETE_STATS_PREFIX}.namespace.default.total`,
          `${DELETE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${DELETE_STATS_PREFIX}.total`,
          `${DELETE_STATS_PREFIX}.namespace.default.total`,
          `${DELETE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${DELETE_STATS_PREFIX}.total`,
          `${DELETE_STATS_PREFIX}.namespace.custom.total`,
          `${DELETE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsFind({
        request,
      } as BaseIncrementOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${FIND_STATS_PREFIX}.total`,
          `${FIND_STATS_PREFIX}.namespace.default.total`,
          `${FIND_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${FIND_STATS_PREFIX}.total`,
          `${FIND_STATS_PREFIX}.namespace.default.total`,
          `${FIND_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${FIND_STATS_PREFIX}.total`,
          `${FIND_STATS_PREFIX}.namespace.custom.total`,
          `${FIND_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsGet({
        request,
      } as BaseIncrementOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${GET_STATS_PREFIX}.total`,
          `${GET_STATS_PREFIX}.namespace.default.total`,
          `${GET_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${GET_STATS_PREFIX}.total`,
          `${GET_STATS_PREFIX}.namespace.default.total`,
          `${GET_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${GET_STATS_PREFIX}.total`,
          `${GET_STATS_PREFIX}.namespace.custom.total`,
          `${GET_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsResolve({
        request,
      } as BaseIncrementOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${RESOLVE_STATS_PREFIX}.total`,
          `${RESOLVE_STATS_PREFIX}.namespace.default.total`,
          `${RESOLVE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${RESOLVE_STATS_PREFIX}.total`,
          `${RESOLVE_STATS_PREFIX}.namespace.default.total`,
          `${RESOLVE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${RESOLVE_STATS_PREFIX}.total`,
          `${RESOLVE_STATS_PREFIX}.namespace.custom.total`,
          `${RESOLVE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsUpdate({
        request,
      } as BaseIncrementOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${UPDATE_STATS_PREFIX}.total`,
          `${UPDATE_STATS_PREFIX}.namespace.default.total`,
          `${UPDATE_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${UPDATE_STATS_PREFIX}.total`,
          `${UPDATE_STATS_PREFIX}.namespace.default.total`,
          `${UPDATE_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${UPDATE_STATS_PREFIX}.total`,
          `${UPDATE_STATS_PREFIX}.namespace.custom.total`,
          `${UPDATE_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsImport({
        request,
      } as IncrementSavedObjectsImportOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${IMPORT_STATS_PREFIX}.total`,
          `${IMPORT_STATS_PREFIX}.namespace.default.total`,
          `${IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
          `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`,
          `${IMPORT_STATS_PREFIX}.overwriteEnabled.no`,
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
      } as IncrementSavedObjectsImportOptions);
      await usageStatsClient.incrementSavedObjectsImport({
        request,
        createNewCopies: false,
        overwrite: true,
      } as IncrementSavedObjectsImportOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(2);
      expect(repositoryMock.incrementCounter).toHaveBeenNthCalledWith(
        1,
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${IMPORT_STATS_PREFIX}.total`,
          `${IMPORT_STATS_PREFIX}.namespace.default.total`,
          `${IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
          `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.yes`,
          // excludes 'overwriteEnabled.yes' and 'overwriteEnabled.no' when createNewCopies is true
        ],
        incrementOptions
      );
      expect(repositoryMock.incrementCounter).toHaveBeenNthCalledWith(
        2,
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${IMPORT_STATS_PREFIX}.total`,
          `${IMPORT_STATS_PREFIX}.namespace.default.total`,
          `${IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
          `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`,
          `${IMPORT_STATS_PREFIX}.overwriteEnabled.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${IMPORT_STATS_PREFIX}.total`,
          `${IMPORT_STATS_PREFIX}.namespace.custom.total`,
          `${IMPORT_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
          `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`,
          `${IMPORT_STATS_PREFIX}.overwriteEnabled.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      const request = httpServerMock.createKibanaRequest();
      await usageStatsClient.incrementSavedObjectsResolveImportErrors({
        request,
      } as IncrementSavedObjectsResolveImportErrorsOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${RESOLVE_IMPORT_STATS_PREFIX}.total`,
          `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.default.total`,
          `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
          `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`,
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
      } as IncrementSavedObjectsResolveImportErrorsOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${RESOLVE_IMPORT_STATS_PREFIX}.total`,
          `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.default.total`,
          `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
          `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${RESOLVE_IMPORT_STATS_PREFIX}.total`,
          `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.custom.total`,
          `${RESOLVE_IMPORT_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
          `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${EXPORT_STATS_PREFIX}.total`,
          `${EXPORT_STATS_PREFIX}.namespace.default.total`,
          `${EXPORT_STATS_PREFIX}.namespace.default.kibanaRequest.no`,
          `${EXPORT_STATS_PREFIX}.allTypesSelected.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${EXPORT_STATS_PREFIX}.total`,
          `${EXPORT_STATS_PREFIX}.namespace.default.total`,
          `${EXPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
          `${EXPORT_STATS_PREFIX}.allTypesSelected.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${EXPORT_STATS_PREFIX}.total`,
          `${EXPORT_STATS_PREFIX}.namespace.custom.total`,
          `${EXPORT_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
          `${EXPORT_STATS_PREFIX}.allTypesSelected.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles the default namespace string and first party request appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementLegacyDashboardsImport({
        request,
      } as IncrementSavedObjectsExportOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX}.total`,
          `${LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX}.namespace.default.total`,
          `${LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX}.total`,
          `${LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX}.namespace.custom.total`,
          `${LEGACY_DASHBOARDS_IMPORT_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles the default namespace string and first party request appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup(DEFAULT_NAMESPACE_STRING);

      const request = httpServerMock.createKibanaRequest({ headers: firstPartyRequestHeaders });
      await usageStatsClient.incrementLegacyDashboardsExport({
        request,
      } as IncrementSavedObjectsExportOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX}.total`,
          `${LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX}.namespace.default.total`,
          `${LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX}.total`,
          `${LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX}.namespace.custom.total`,
          `${LEGACY_DASHBOARDS_EXPORT_STATS_PREFIX}.namespace.custom.kibanaRequest.no`,
        ],
        incrementOptions
      );
    });
  });
});
