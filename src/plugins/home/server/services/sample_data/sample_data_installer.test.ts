/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { insertDataIntoIndexMock, findSampleObjectsMock } from './sample_data_installer.test.mocks';
import type { SavedObjectsImportFailure } from 'kibana/server';
import {
  savedObjectsClientMock,
  savedObjectsServiceMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '../../../../../core/server/mocks';
import type { SampleDatasetSchema } from './lib/sample_dataset_registry_types';
import { SampleDataInstaller } from './sample_data_installer';
import { SampleDataInstallError } from './errors';

const testDatasets: SampleDatasetSchema[] = [
  {
    id: 'test_single_data_index',
    name: 'Test with a single data index',
    description: 'See name',
    previewImagePath: 'previewImagePath',
    darkPreviewImagePath: 'darkPreviewImagePath',
    overviewDashboard: 'overviewDashboard',
    defaultIndex: 'defaultIndex',
    savedObjects: [
      {
        id: 'some-dashboard',
        type: 'dashboard',
        attributes: {
          hello: 'dolly',
        },
        references: [],
      },
      {
        id: 'another-dashboard',
        type: 'dashboard',
        attributes: {
          foo: 'bar',
        },
        references: [],
      },
    ],
    dataIndices: [
      {
        id: 'test_single_data_index',
        dataPath: '/dataPath',
        fields: { someField: { type: 'keyword' } },
        currentTimeMarker: '2018-01-09T00:00:00',
        timeFields: ['@timestamp'],
        preserveDayOfWeekTimeOfDay: true,
      },
    ],
  },
];

describe('SampleDataInstaller', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let soImporter: ReturnType<typeof savedObjectsServiceMock.createImporter>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let installer: SampleDataInstaller;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient();
    soClient = savedObjectsClientMock.create();
    soImporter = savedObjectsServiceMock.createImporter();
    logger = loggingSystemMock.createLogger();

    installer = new SampleDataInstaller({
      esClient,
      soClient,
      soImporter,
      logger,
      sampleDatasets: testDatasets,
    });

    soImporter.import.mockResolvedValue({
      success: true,
      successCount: 1,
      errors: [],
      warnings: [],
    });

    soClient.delete.mockResolvedValue({});

    esClient.asCurrentUser.indices.getAlias.mockImplementation(() => {
      throw new Error('alias not found');
    });

    findSampleObjectsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    insertDataIntoIndexMock.mockReset();
    findSampleObjectsMock.mockReset();
  });

  describe('#install', () => {
    it('cleanups the data index before installing', async () => {
      await installer.install('test_single_data_index');

      expect(esClient.asCurrentUser.indices.delete).toHaveBeenCalledTimes(1);
      expect(esClient.asCurrentUser.indices.delete).toHaveBeenCalledWith({
        index: 'kibana_sample_data_test_single_data_index',
      });
    });

    it('creates the data index', async () => {
      await installer.install('test_single_data_index');

      expect(esClient.asCurrentUser.indices.create).toHaveBeenCalledTimes(1);
      expect(esClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
        index: 'kibana_sample_data_test_single_data_index',
        body: {
          settings: { index: { number_of_shards: 1, auto_expand_replicas: '0-1' } },
          mappings: { properties: { someField: { type: 'keyword' } } },
        },
      });
    });

    it('inserts the data into the index', async () => {
      await installer.install('test_single_data_index');

      expect(insertDataIntoIndexMock).toHaveBeenCalledTimes(1);
      expect(insertDataIntoIndexMock).toHaveBeenCalledWith({
        index: 'kibana_sample_data_test_single_data_index',
        nowReference: expect.any(String),
        logger,
        esClient,
        dataIndexConfig: testDatasets[0].dataIndices[0],
      });
    });

    it('imports the saved objects', async () => {
      await installer.install('test_single_data_index');

      expect(soImporter.import).toHaveBeenCalledTimes(1);
      expect(soImporter.import).toHaveBeenCalledWith({
        readStream: expect.any(Readable),
        overwrite: true,
        createNewCopies: false,
      });
    });

    it('throws a SampleDataInstallError with code 404 when the dataset is not found', async () => {
      try {
        await installer.install('unknown_data_set');
        expect('should have returned an error').toEqual('but it did not');
      } catch (e) {
        expect(e).toBeInstanceOf(SampleDataInstallError);
        expect((e as SampleDataInstallError).httpCode).toEqual(404);
      }
    });

    it('does not throw when the index removal fails', async () => {
      esClient.asCurrentUser.indices.delete.mockImplementation(() => {
        throw new Error('cannot delete index');
      });

      await expect(installer.install('test_single_data_index')).resolves.toBeDefined();
    });

    it('throws a SampleDataInstallError when the index creation fails', async () => {
      esClient.asCurrentUser.indices.create.mockImplementation(() => {
        // eslint-disable-next-line no-throw-literal
        throw {
          message: 'Cannot create index',
          status: 500,
        };
      });

      try {
        await installer.install('test_single_data_index');
        expect('should have returned an error').toEqual('but it did not');
      } catch (e) {
        expect(e).toBeInstanceOf(SampleDataInstallError);
        expect((e as SampleDataInstallError).httpCode).toEqual(500);
      }
    });

    it('throws a SampleDataInstallError if the savedObject import returns any error', async () => {
      soImporter.import.mockResolvedValue({
        success: true,
        successCount: 1,
        errors: [{ type: 'type', id: 'id' } as SavedObjectsImportFailure],
        warnings: [],
      });

      try {
        await installer.install('test_single_data_index');
        expect('should have returned an error').toEqual('but it did not');
      } catch (e) {
        expect(e).toBeInstanceOf(SampleDataInstallError);
        expect(e.message).toContain('sample_data install errors while loading saved objects');
        expect((e as SampleDataInstallError).httpCode).toEqual(500);
      }
    });

    describe('when the data index is using an alias', () => {
      it('deletes the alias and the index', async () => {
        const indexName = 'target_index';

        esClient.asCurrentUser.indices.getAlias.mockResponse({
          [indexName]: {
            aliases: {
              kibana_sample_data_test_single_data_index: {},
            },
          },
        });

        await installer.install('test_single_data_index');

        expect(esClient.asCurrentUser.indices.deleteAlias).toHaveBeenCalledTimes(1);
        expect(esClient.asCurrentUser.indices.deleteAlias).toHaveBeenCalledWith({
          name: 'kibana_sample_data_test_single_data_index',
          index: indexName,
        });

        expect(esClient.asCurrentUser.indices.delete).toHaveBeenCalledTimes(1);
        expect(esClient.asCurrentUser.indices.delete).toHaveBeenCalledWith({
          index: indexName,
        });
      });
    });
  });

  describe('#uninstall', () => {
    it('deletes the data index', async () => {
      await installer.uninstall('test_single_data_index');

      expect(esClient.asCurrentUser.indices.delete).toHaveBeenCalledTimes(1);
      expect(esClient.asCurrentUser.indices.delete).toHaveBeenCalledWith({
        index: 'kibana_sample_data_test_single_data_index',
      });
    });

    it('deletes the saved objects', async () => {
      findSampleObjectsMock.mockResolvedValue([
        { type: 'dashboard', id: 'foo', foundObjectId: 'foo' },
        { type: 'dashboard', id: 'hello', foundObjectId: 'dolly' },
      ]);

      await installer.uninstall('test_single_data_index');

      expect(soClient.delete).toHaveBeenCalledTimes(2);
      expect(soClient.delete).toHaveBeenCalledWith('dashboard', 'foo');
      expect(soClient.delete).toHaveBeenCalledWith('dashboard', 'dolly');
    });

    it('throws a SampleDataInstallError with code 404 when the dataset is not found', async () => {
      try {
        await installer.uninstall('unknown_data_set');
        expect('should have returned an error').toEqual('but it did not');
      } catch (e) {
        expect(e).toBeInstanceOf(SampleDataInstallError);
        expect((e as SampleDataInstallError).httpCode).toEqual(404);
      }
    });

    it('does not throw when the index removal fails', async () => {
      esClient.asCurrentUser.indices.delete.mockImplementation(() => {
        throw new Error('cannot delete index');
      });

      await expect(installer.uninstall('test_single_data_index')).resolves.toBeDefined();
    });

    it('throws a SampleDataInstallError if any SO deletion fails', async () => {
      findSampleObjectsMock.mockResolvedValue([
        { type: 'dashboard', id: 'foo', foundObjectId: 'foo' },
        { type: 'dashboard', id: 'hello', foundObjectId: 'dolly' },
      ]);

      soClient.delete.mockImplementation(async (type: string, id: string) => {
        if (id === 'dolly') {
          throw new Error('could not delete dolly');
        }
        return {};
      });

      try {
        await installer.uninstall('test_single_data_index');
        expect('should have returned an error').toEqual('but it did not');
      } catch (e) {
        expect(e).toBeInstanceOf(SampleDataInstallError);
        expect((e as SampleDataInstallError).httpCode).toEqual(500);
      }
    });

    describe('when the data index is using an alias', () => {
      it('deletes the alias and the index', async () => {
        const indexName = 'target_index';

        esClient.asCurrentUser.indices.getAlias.mockResponse({
          [indexName]: {
            aliases: {
              kibana_sample_data_test_single_data_index: {},
            },
          },
        });

        await installer.uninstall('test_single_data_index');

        expect(esClient.asCurrentUser.indices.deleteAlias).toHaveBeenCalledTimes(1);
        expect(esClient.asCurrentUser.indices.deleteAlias).toHaveBeenCalledWith({
          name: 'kibana_sample_data_test_single_data_index',
          index: indexName,
        });

        expect(esClient.asCurrentUser.indices.delete).toHaveBeenCalledTimes(1);
        expect(esClient.asCurrentUser.indices.delete).toHaveBeenCalledWith({
          index: indexName,
        });
      });
    });
  });
});
