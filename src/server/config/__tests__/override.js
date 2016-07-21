var override = require('../override');
var expect = require('expect.js');

describe('override(target, source)', function () {

  it('should override the values form source to target', function () {
    var target = {
      test: {
        enable: true,
        host: ['host-01', 'host-02'],
        client: {
          type: 'sql'
        }
      }
    };
    var source = { test: { client: { type: 'nosql' } } };
    expect(override(target, source)).to.eql({
      test: {
        enable: true,
        host: ['host-01', 'host-02'],
        client: {
          type: 'nosql'
        }
      }
    });
  });

});
