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

import { savedObjectsRepositoryMock } from '../mocks';
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

describe('CoreUsageStatsClient', () => {
  const setup = () => {
    const debugLoggerMock = jest.fn();
    const repositoryMock = savedObjectsRepositoryMock.create();
    const usageStatsClient = new CoreUsageStatsClient(
      debugLoggerMock,
      Promise.resolve(repositoryMock)
    );
    return { usageStatsClient, debugLoggerMock, repositoryMock };
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

      await expect(
        usageStatsClient.incrementSavedObjectsImport({} as IncrementSavedObjectsImportOptions)
      ).resolves.toBeUndefined();
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      await usageStatsClient.incrementSavedObjectsImport({} as IncrementSavedObjectsImportOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${IMPORT_STATS_PREFIX}.total`,
          `${IMPORT_STATS_PREFIX}.kibanaRequest.no`,
          `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`,
          `${IMPORT_STATS_PREFIX}.overwriteEnabled.no`,
        ],
        incrementOptions
      );
    });

    it('handles truthy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      await usageStatsClient.incrementSavedObjectsImport({
        headers: firstPartyRequestHeaders,
        createNewCopies: true,
        overwrite: true,
      } as IncrementSavedObjectsImportOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${IMPORT_STATS_PREFIX}.total`,
          `${IMPORT_STATS_PREFIX}.kibanaRequest.yes`,
          `${IMPORT_STATS_PREFIX}.createNewCopiesEnabled.yes`,
          `${IMPORT_STATS_PREFIX}.overwriteEnabled.yes`,
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsResolveImportErrors', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      await expect(
        usageStatsClient.incrementSavedObjectsResolveImportErrors(
          {} as IncrementSavedObjectsResolveImportErrorsOptions
        )
      ).resolves.toBeUndefined();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      await usageStatsClient.incrementSavedObjectsResolveImportErrors(
        {} as IncrementSavedObjectsResolveImportErrorsOptions
      );
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${RESOLVE_IMPORT_STATS_PREFIX}.total`,
          `${RESOLVE_IMPORT_STATS_PREFIX}.kibanaRequest.no`,
          `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.no`,
        ],
        incrementOptions
      );
    });

    it('handles truthy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      await usageStatsClient.incrementSavedObjectsResolveImportErrors({
        headers: firstPartyRequestHeaders,
        createNewCopies: true,
      } as IncrementSavedObjectsResolveImportErrorsOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${RESOLVE_IMPORT_STATS_PREFIX}.total`,
          `${RESOLVE_IMPORT_STATS_PREFIX}.kibanaRequest.yes`,
          `${RESOLVE_IMPORT_STATS_PREFIX}.createNewCopiesEnabled.yes`,
        ],
        incrementOptions
      );
    });
  });

  describe('#incrementSavedObjectsExport', () => {
    it('does not throw an error if repository incrementCounter operation fails', async () => {
      const { usageStatsClient, repositoryMock } = setup();
      repositoryMock.incrementCounter.mockRejectedValue(new Error('Oh no!'));

      await expect(
        usageStatsClient.incrementSavedObjectsExport({} as IncrementSavedObjectsExportOptions)
      ).resolves.toBeUndefined();
      expect(repositoryMock.incrementCounter).toHaveBeenCalled();
    });

    it('handles falsy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      await usageStatsClient.incrementSavedObjectsExport({
        types: undefined,
        supportedTypes: ['foo', 'bar'],
      } as IncrementSavedObjectsExportOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${EXPORT_STATS_PREFIX}.total`,
          `${EXPORT_STATS_PREFIX}.kibanaRequest.no`,
          `${EXPORT_STATS_PREFIX}.allTypesSelected.no`,
        ],
        incrementOptions
      );
    });

    it('handles truthy options appropriately', async () => {
      const { usageStatsClient, repositoryMock } = setup();

      await usageStatsClient.incrementSavedObjectsExport({
        headers: firstPartyRequestHeaders,
        types: ['foo', 'bar'],
        supportedTypes: ['foo', 'bar'],
      } as IncrementSavedObjectsExportOptions);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledTimes(1);
      expect(repositoryMock.incrementCounter).toHaveBeenCalledWith(
        CORE_USAGE_STATS_TYPE,
        CORE_USAGE_STATS_ID,
        [
          `${EXPORT_STATS_PREFIX}.total`,
          `${EXPORT_STATS_PREFIX}.kibanaRequest.yes`,
          `${EXPORT_STATS_PREFIX}.allTypesSelected.yes`,
        ],
        incrementOptions
      );
    });
  });
});
