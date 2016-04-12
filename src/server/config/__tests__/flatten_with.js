import requireCovered from '../../../test_utils/requireCovered';
import expect from 'expect.js';

const flattenWith = requireCovered('server/config/flatten_with');

describe('flatten_with(dot, nestedObj)', function () {

  it('should flatten object with dot', function () {
    let nestedObj = {
      test: {
        enable: true,
        hosts: ['host-01', 'host-02'],
        client: {
          type: 'nosql',
          pool: [{ port: 5051 }, { port: 5052 }]
        }
      }
    };
    expect(flattenWith('.', nestedObj)).to.eql({
      'test.enable': true,
      'test.hosts': ['host-01', 'host-02'],
      'test.client.type': 'nosql',
      'test.client.pool': [{ port: 5051 }, { port: 5052 }]
    });
  });

});


