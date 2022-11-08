/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sinon from 'sinon';
import { createListStream, createPromiseFromStreams, createConcatStream } from '@kbn/utils';

import { createStubClient, createStubStats } from './__mocks__/stubs';

import { createGenerateIndexRecordsStream } from './generate_index_records_stream';

describe('esArchiver: createGenerateIndexRecordsStream()', () => {
  it('consumes index names and queries for the mapping of each', async () => {
    const indices = ['index1', 'index2', 'index3', 'index4'];
    const stats = createStubStats();
    const client = createStubClient(indices);

    await createPromiseFromStreams([
      createListStream(indices),
      createGenerateIndexRecordsStream({ client, stats }),
    ]);

    expect(stats.getTestSummary()).toEqual({
      archivedIndex: 4,
    });

    sinon.assert.callCount(client.indices.get as sinon.SinonSpy, 4);
    sinon.assert.notCalled(client.indices.create as sinon.SinonSpy);
    sinon.assert.notCalled(client.indices.delete as sinon.SinonSpy);
    sinon.assert.notCalled(client.indices.exists as sinon.SinonSpy);
  });

  it('filters index metadata from settings', async () => {
    const stats = createStubStats();
    const client = createStubClient(['index1']);

    await createPromiseFromStreams([
      createListStream(['index1']),
      createGenerateIndexRecordsStream({ client, stats }),
    ]);

    const params = (client.indices.get as sinon.SinonSpy).args[0][0];
    expect(params).toHaveProperty('filter_path');
    const filters: string[] = params.filter_path;
    expect(filters.some((path) => path.includes('index.creation_date'))).toBe(true);
    expect(filters.some((path) => path.includes('index.uuid'))).toBe(true);
    expect(filters.some((path) => path.includes('index.version'))).toBe(true);
    expect(filters.some((path) => path.includes('index.provided_name'))).toBe(true);
  });

  it('produces one index record for each index name it receives', async () => {
    const stats = createStubStats();
    const client = createStubClient(['index1', 'index2', 'index3']);

    const indexRecords = await createPromiseFromStreams<any[]>([
      createListStream(['index1', 'index2', 'index3']),
      createGenerateIndexRecordsStream({ client, stats }),
      createConcatStream([]),
    ]);

    expect(indexRecords).toHaveLength(3);

    expect(indexRecords[0]).toHaveProperty('type', 'index');
    expect(indexRecords[0]).toHaveProperty('value');
    expect(indexRecords[0].value).toHaveProperty('index', 'index1');

    expect(indexRecords[1]).toHaveProperty('type', 'index');
    expect(indexRecords[1]).toHaveProperty('value');
    expect(indexRecords[1].value).toHaveProperty('index', 'index2');

    expect(indexRecords[2]).toHaveProperty('type', 'index');
    expect(indexRecords[2]).toHaveProperty('value');
    expect(indexRecords[2].value).toHaveProperty('index', 'index3');
  });

  it('understands aliases', async () => {
    const stats = createStubStats();
    const client = createStubClient(['index1'], { foo: 'index1' });

    const indexRecords = await createPromiseFromStreams([
      createListStream(['index1']),
      createGenerateIndexRecordsStream({ client, stats }),
      createConcatStream([]),
    ]);

    expect(indexRecords).toEqual([
      {
        type: 'index',
        value: {
          index: 'index1',
          settings: {},
          mappings: {},
          aliases: { foo: {} },
        },
      },
    ]);
  });

  describe('change index names', () => {
    it('changes .kibana* index names if keepIndexNames is not enabled', async () => {
      const stats = createStubStats();
      const client = createStubClient(['.kibana_7.16.0_001']);

      const indexRecords = await createPromiseFromStreams([
        createListStream(['.kibana_7.16.0_001']),
        createGenerateIndexRecordsStream({ client, stats }),
        createConcatStream([]),
      ]);

      expect(indexRecords).toEqual([
        { type: 'index', value: expect.objectContaining({ index: '.kibana_1' }) },
      ]);
    });

    it('does not change non-.kibana* index names if keepIndexNames is not enabled', async () => {
      const stats = createStubStats();
      const client = createStubClient(['.foo']);

      const indexRecords = await createPromiseFromStreams([
        createListStream(['.foo']),
        createGenerateIndexRecordsStream({ client, stats }),
        createConcatStream([]),
      ]);

      expect(indexRecords).toEqual([
        { type: 'index', value: expect.objectContaining({ index: '.foo' }) },
      ]);
    });

    it('does not change .kibana* index names if keepIndexNames is enabled', async () => {
      const stats = createStubStats();
      const client = createStubClient(['.kibana_7.16.0_001']);

      const indexRecords = await createPromiseFromStreams([
        createListStream(['.kibana_7.16.0_001']),
        createGenerateIndexRecordsStream({ client, stats, keepIndexNames: true }),
        createConcatStream([]),
      ]);

      expect(indexRecords).toEqual([
        { type: 'index', value: expect.objectContaining({ index: '.kibana_7.16.0_001' }) },
      ]);
    });
  });
});
