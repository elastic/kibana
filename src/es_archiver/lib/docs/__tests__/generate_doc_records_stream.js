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
      stubGetAlias('logstash-*'),
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
      stubGetAlias('logstash-*'),
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
      stubGetAlias('index1'),
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
      stubGetAlias('index2'),
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

  it('records aliases for each index if they exist', async () => {
    const stats = createStubStats();
    const stubGetDocs = (index, docs) => (name, params) => {
      expect(name).to.be('search');
      expect(params).to.have.property('index', index);
      return Promise.resolve({
        _scroll_id: `${index}ScrollId`,
        hits: { total: docs.length, hits: docs }
      });
    };
    const client = createStubClient([
      stubGetAlias('aaa', { aliasa: {}, aliasb: {} }),
      stubGetDocs('aaa', [{ _id: 1 }]),
      stubGetAlias('bbb', { aliasc: {} }),
      stubGetDocs('bbb', [{ _id: 2 }, { _id: 3 }]),
    ]);

    const docRecords = await createPromiseFromStreams([
      createListStream([ 'aaa', 'bbb' ]),
      createGenerateDocRecordsStream(client, stats),
      createConcatStream([])
    ]);

    expect(docRecords).to.eql([
      {
        type: 'alias',
        value: {
          index: 'aaa',
          aliases: {
            aliasa: {},
            aliasb: {},
          },
        },
      },

      {
        type: 'doc',
        value: {
          id: 1,
          index: undefined,
          source: undefined,
          type: undefined,
        }
      },

      {
        type: 'alias',
        value: {
          index: 'bbb',
          aliases: {
            aliasc: {},
          },
        },
      },

      {
        type: 'doc',
        value: {
          id: 2,
          index: undefined,
          source: undefined,
          type: undefined,
        }
      },

      {
        type: 'doc',
        value: {
          id: 3,
          index: undefined,
          source: undefined,
          type: undefined,
        }
      },
    ]);
  });
});

function stubGetAlias(index, aliases = {}) {
  return (name, params) => {
    expect(name).to.be('getAlias');
    expect(params).to.eql({ index });
    return Promise.resolve({ [index]: { aliases } });
  };
}