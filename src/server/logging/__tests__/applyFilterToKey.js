var applyFilterToKey = require('../applyFilterToKey');
var applyFiltersToKeys = applyFilterToKey.applyFiltersToKeys;
var expect = require('expect.js');

function fixture() {
  return {
    req: {
      headers: {
        authorization: 'Basic dskd939k2i'
      }
    }
  };
}

describe('applyFilterToKey(obj, key, action)', function () {

  it('should remove a key from an object recursivly', function () {
    var data = fixture();
    data = applyFilterToKey(data, 'authorization', 'remove');
    expect(data).to.eql({
      req: { headers: {} }
    });
  });

  it('should remove an entire branch', function () {
    var data = fixture();
    data = applyFilterToKey(data, 'headers', 'remove');
    expect(data).to.eql({
      req: { }
    });
  });

  it('should remove an entire branch with censor', function () {
    var data = fixture();
    data = applyFilterToKey(data, 'headers', 'censor');
    expect(data).to.eql({
      req: { }
    });
  });

  it('should censor a key in an object recursivly', function () {
    var data = fixture();
    data = applyFilterToKey(data, 'authorization', 'censor');
    expect(data).to.eql({
      req: {
        headers: {
          authorization: 'XXXXXXXXXXXXXXXX'
        }
      }
    });
  });

  it('should censor key with a RegEx in an object recursivly', function () {
    var data = fixture();
    var regex = '/([^\\s]+)$/';
    data = applyFilterToKey(data, 'authorization', regex);
    expect(data).to.eql({
      req: {
        headers: {
          authorization: 'Basic XXXXXXXXXX'
        }
      }
    });
  });

  it('uses the JSON version of objects for serializaion', function () {
    var data = applyFilterToKey({
      a: {
        b: 1,
        toJSON: () => ({ c: 10 })
      }
    }, 'c', 'censor');

    expect(data).to.eql({
      a: {
        c: 'XX'
      }
    });
  });

  describe('applyFiltersToKeys(obj, actionsByKey)', function () {
    it('applies applyFilterToKey() for each key+prop in actionsByKey', function () {
      var data = applyFiltersToKeys({
        a: {
          b: {
            c: 1
          },
          d: {
            e: 'foobar'
          }
        }
      }, {
        b: 'remove',
        e: 'censor',
      });

      expect(data).to.eql({
        a: {
          d: {
            e: 'XXXXXX',
          },
        },
      });
    });
  });
});
