import expect from 'expect.js';
import { getDocType } from '../get_doc_type';

describe('getDocType', () => {
  it('gets the doc type from a legacy index', () => {
    const legacyResponse = {
      _index: '.kibana',
      _type: 'config',
      _id: '6.0.0-alpha2',
      _score: 1,
      _source: {
        buildNum: 8467,
        defaultIndex: '.kibana'
      }
    };

    expect(getDocType(legacyResponse)).to.eql('config');
  });

  it('gets the doc type from a new index', () => {
    const newResponse = {
      _index: '.kibana',
      _type: 'doc',
      _id: 'AVzBOLGoIr2L3MkvUTRP',
      _score: 1,
      _source: {
        type: 'config',
        config: {
          buildNum: 8467,
          defaultIndex: '.kibana'
        }
      }
    };

    expect(getDocType(newResponse)).to.eql('config');
  });
});
