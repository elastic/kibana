var applyFilterToKey = require('../applyFilterToKey');
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
    applyFilterToKey(data, 'authorization', 'remove');
    expect(data).to.eql({
      req: { headers: {} }
    });
  });

  it('should censor a key in an object recursivly', function () {
    var data = fixture();
    applyFilterToKey(data, 'authorization', 'censor');
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
    var regex = /([^\s]+)$/;
    applyFilterToKey(data, 'authorization', regex);
    expect(data).to.eql({
      req: {
        headers: {
          authorization: 'Basic XXXXXXXXXX'
        }
      }
    });
  });

});
