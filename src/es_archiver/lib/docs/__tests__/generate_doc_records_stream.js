import sinon from 'sinon';
import expect from 'expect.js';
import { delay } from 'bluebird';

import {
  createListStream,
  createPromiseFromStreams,
  createConcatStream,
} from '../../../../utils';

import { createGenerateDocRecordsStream } from '../generate_doc_records_stream';
import {
  createStubStats,
  createStubClient,
} from './stubs';

describe('esArchiver: createGenerateDocRecordsStream()', () => {
  it('scolls 1000 documents at a time', async () => {
    const stats = createStubStats();
    const client = createStubClient([
      (name, params) => {
        expect(name).to.be('search');
        expect(params).to.have.property('index', 'logstash-*');
        expect(params).to.have.property('size', 1000);
        return {
          hits: {
            total: 0,
            hits: []
          }
        };
      }
    ]);

    await createPromiseFromStreams([
      createListStream(['logstash-*']),
      createGenerateDocRecordsStream(client, stats)
    ]);
  });

  it('uses a 1 minute scroll timeout', async () => {
    const stats = createStubStats();
    const client = createStubClient([
      (name, params) => {
        expect(name).to.be('search');
        expect(params).to.have.property('index', 'logstash-*');
        expect(params).to.have.property('scroll', '1m');
        return {
          hits: {
            total: 0,
            hits: []
          }
        };
      }
    ]);

    await createPromiseFromStreams([
      createListStream(['logstash-*']),
      createGenerateDocRecordsStream(client, stats)
    ]);
  });

  it('consumes index names and scrolls completely before continuing', async () => {
    const stats = createStubStats();
    let checkpoint = Date.now();
    const client = createStubClient([
      async (name, params) => {
        expect(name).to.be('search');
        expect(params).to.have.property('index', 'index1');
        await delay(200);
        return {
          _scroll_id: 'index1ScrollId',
          hits: { total: 2, hits: [ { _id: 1 } ] }
        };
      },
      async (name, params) => {
        expect(name).to.be('scroll');
        expect(params).to.have.property('scrollId', 'index1ScrollId');
        expect(Date.now() - checkpoint).to.not.be.lessThan(200);
        checkpoint = Date.now();
        await delay(200);
        return { hits: { total: 2, hits: [ { _id: 2 } ] } };
      },
      async (name, params) => {
        expect(name).to.be('search');
        expect(params).to.have.property('index', 'index2');
        expect(Date.now() - checkpoint).to.not.be.lessThan(200);
        checkpoint = Date.now();
        await delay(200);
        return { hits: { total: 0, hits: [] } };
      }
    ]);

    const docRecords = await createPromiseFromStreams([
      createListStream([
        'index1',
        'index2',
      ]),
      createGenerateDocRecordsStream(client, stats),
      createConcatStream([])
    ]);

    expect(docRecords).to.eql([
      {
        type: 'doc',
        value: {
          index: undefined,
          type: undefined,
          id: 1,
          source: undefined
        }
      },
      {
        type: 'doc',
        value: {
          index: undefined,
          type: undefined,
          id: 2,
          source: undefined
        }
      },
    ]);
    sinon.assert.calledTwice(stats.archivedDoc);
  });
});
