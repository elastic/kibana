var applyFiltersToKeys = require('../applyFiltersToKeys');
var expect = require('expect.js');

describe('applyFiltersToKeys(obj, actionsByKey)', function () {
  it('applies for each key+prop in actionsByKey', function () {
    var data = applyFiltersToKeys({
      a: {
        b: {
          c: 1
        },
        d: {
          e: 'foobar'
        }
      },
      req: {
        headers: {
          authorization: 'Basic dskd939k2i'
        }
      }
    }, {
      b: 'remove',
      e: 'censor',
      authorization: '/([^\\s]+)$/'
    });

    expect(data).to.eql({
      a: {
        d: {
          e: 'XXXXXX',
        },
      },
      req: {
        headers: {
          authorization: 'Basic XXXXXXXXXX'
        }
      }
    });
  });
});
