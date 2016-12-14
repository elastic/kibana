import flattenWith from '../flatten_with';
import expect from 'expect.js';

describe('flatten_with(dot, nestedObj)', function () {

  it('should flatten object with dot', function () {
    const nestedObj = {
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


