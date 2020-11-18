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
import { CORE_TELEMETRY_TYPE } from './constants';
import { CoreTelemetry } from './types';
import {
  IncrementSavedObjectsImportOptions,
  IncrementSavedObjectsResolveImportErrorsOptions,
  IncrementSavedObjectsExportOptions,
} from './core_telemetry_client';
import { CoreTelemetryClient } from '.';

describe('CoreTelemetryClient', () => {
  const setup = () => {
    const debugLoggerMock = jest.fn();
    const repositoryMock = savedObjectsRepositoryMock.create();
    const telemetryClient = new CoreTelemetryClient(debugLoggerMock, repositoryMock);
    return { telemetryClient, debugLoggerMock, repositoryMock };
  };

  const createMockData = (attributes: CoreTelemetry) => ({
    id: CORE_TELEMETRY_TYPE,
    type: CORE_TELEMETRY_TYPE,
    attributes,
    references: [],
  });

  const createOptions = { overwrite: true, id: CORE_TELEMETRY_TYPE };

  // mock data for existing fields
  const savedObjectsImport = {
    total: 5,
    createNewCopies: { enabled: 2, disabled: 3 },
    overwrite: { enabled: 1, disabled: 4 },
  };
  const savedObjectsResolveImportErrors = {
    total: 13,
    createNewCopies: { enabled: 6, disabled: 7 },
  };
  const savedObjectsExport = {
    total: 17,
    allTypes: { yes: 8, no: 9 },
  };

  describe('#getTelemetryData', () => {
    it('returns empty object when encountering a repository error', async () => {
      const { telemetryClient, repositoryMock } = setup();
      repositoryMock.get.mockRejectedValue(new Error('Oh no!'));

      const result = await telemetryClient.getTelemetryData();
      expect(result).toEqual({});
    });

    it('returns object attributes when telemetry data exists', async () => {
      const { telemetryClient, repositoryMock } = setup();
      const attributes = { foo: 'bar' } as CoreTelemetry;
      repositoryMock.get.mockResolvedValue(createMockData(attributes));

      const result = await telemetryClient.getTelemetryData();
      expect(result).toEqual(attributes);
    });
  });

  describe('#incrementSavedObjectsImport', () => {
    it('creates fields if attributes are empty', async () => {
      const { telemetryClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(createMockData({}));

      await telemetryClient.incrementSavedObjectsImport({} as IncrementSavedObjectsImportOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        CORE_TELEMETRY_TYPE,
        {
          apiCalls: {
            savedObjectsImport: {
              total: 1,
              createNewCopies: { enabled: 0, disabled: 1 },
              overwrite: { enabled: 0, disabled: 1 },
            },
          },
        },
        createOptions
      );
    });

    it('increments existing fields, leaves other fields unchanged, and handles createNewCopies=true / overwrite=true appropriately', async () => {
      const { telemetryClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(
        createMockData({
          apiCalls: { savedObjectsImport, savedObjectsResolveImportErrors, savedObjectsExport },
        })
      );

      await telemetryClient.incrementSavedObjectsImport({
        createNewCopies: true,
        overwrite: true,
      } as IncrementSavedObjectsImportOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        CORE_TELEMETRY_TYPE,
        {
          apiCalls: {
            // these fields are changed
            savedObjectsImport: {
              total: savedObjectsImport.total + 1,
              createNewCopies: {
                enabled: savedObjectsImport.createNewCopies.enabled + 1,
                disabled: savedObjectsImport.createNewCopies.disabled,
              },
              overwrite: {
                enabled: savedObjectsImport.overwrite.enabled + 1,
                disabled: savedObjectsImport.overwrite.disabled,
              },
            },
            // these fields are unchanged
            savedObjectsResolveImportErrors,
            savedObjectsExport,
          },
        },
        createOptions
      );
    });
  });

  describe('#incrementSavedObjectsResolveImportErrors', () => {
    it('creates fields if attributes are empty', async () => {
      const { telemetryClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(createMockData({}));

      await telemetryClient.incrementSavedObjectsResolveImportErrors(
        {} as IncrementSavedObjectsResolveImportErrorsOptions
      );
      expect(repositoryMock.create).toHaveBeenCalledWith(
        CORE_TELEMETRY_TYPE,
        {
          apiCalls: {
            savedObjectsResolveImportErrors: {
              total: 1,
              createNewCopies: { enabled: 0, disabled: 1 },
            },
          },
        },
        createOptions
      );
    });

    it('increments existing fields, leaves other fields unchanged, and handles createNewCopies=true appropriately', async () => {
      const { telemetryClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(
        createMockData({
          apiCalls: { savedObjectsImport, savedObjectsResolveImportErrors, savedObjectsExport },
        })
      );

      await telemetryClient.incrementSavedObjectsResolveImportErrors({
        createNewCopies: true,
      } as IncrementSavedObjectsResolveImportErrorsOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        CORE_TELEMETRY_TYPE,
        {
          apiCalls: {
            // these fields are changed
            savedObjectsResolveImportErrors: {
              total: savedObjectsResolveImportErrors.total + 1,
              createNewCopies: {
                enabled: savedObjectsResolveImportErrors.createNewCopies.enabled + 1,
                disabled: savedObjectsResolveImportErrors.createNewCopies.disabled,
              },
            },
            // these fields are unchanged
            savedObjectsImport,
            savedObjectsExport,
          },
        },
        createOptions
      );
    });
  });

  describe('#incrementSavedObjectsExport', () => {
    it('creates fields if attributes are empty', async () => {
      const { telemetryClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(createMockData({}));

      await telemetryClient.incrementSavedObjectsExport({
        types: undefined,
        supportedTypes: ['foo', 'bar'],
      } as IncrementSavedObjectsExportOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        CORE_TELEMETRY_TYPE,
        {
          apiCalls: {
            savedObjectsExport: {
              total: 1,
              allTypes: { yes: 0, no: 1 },
            },
          },
        },
        createOptions
      );
    });

    it('increments existing fields, leaves other fields unchanged, and handles types appropriately', async () => {
      const { telemetryClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(
        createMockData({
          apiCalls: { savedObjectsImport, savedObjectsResolveImportErrors, savedObjectsExport },
        })
      );

      await telemetryClient.incrementSavedObjectsExport({
        types: ['foo', 'bar'],
        supportedTypes: ['foo', 'bar'],
      } as IncrementSavedObjectsExportOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        CORE_TELEMETRY_TYPE,
        {
          apiCalls: {
            // these fields are changed
            savedObjectsExport: {
              total: savedObjectsExport.total + 1,
              allTypes: {
                yes: savedObjectsExport.allTypes.yes + 1,
                no: savedObjectsExport.allTypes.no,
              },
            },
            // these fields are unchanged
            savedObjectsImport,
            savedObjectsResolveImportErrors,
          },
        },
        createOptions
      );
    });
  });
});
