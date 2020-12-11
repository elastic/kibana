/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { httpServerMock, httpServiceMock, savedObjectsRepositoryMock } from '../mocks';
import { CORE_USAGE_STATS_TYPE, CORE_USAGE_STATS_ID } from './constants';
import {
  IncrementSavedObjectsImportOptions,
  IncrementSavedObjectsResolveImportErrorsOptions,
  IncrementSavedObjectsExportOptions,
  IMPORT_STATS_PREFIX,
  RESOLVE_IMPORT_STATS_PREFIX,
  EXPORT_STATS_PREFIX,
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
  const firstPartyRequestHeaders = { 'kbn-version': 'a', origin: 'b', referer: 'c' }; // as long as these three header fields are truthy, this will be treated like a first-party request
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
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${IMPORT_STATS_PREFIX}.total`,
          `${IMPORT_STATS_PREFIX}.namespace.default.total`,
          `${IMPORT_STATS_PREFIX}.namespace.default.kibanaRequest.yes`,
          `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.yes`,
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
});
