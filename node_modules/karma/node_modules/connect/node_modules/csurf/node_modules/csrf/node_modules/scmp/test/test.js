var scmp = require('../');
var assert = require('assert');

describe('scmp', function() {
  it('should return true for identical strings', function() {
    assert(scmp('a', 'a'));
    assert(scmp('abc', 'abc'));
    assert(scmp('e727d1464ae12436e899a726da5b2f11d8381b26', 'e727d1464ae12436e899a726da5b2f11d8381b26'));
  });
  
  it('should return false for non-identical strings', function() {
    assert.ifError(scmp('a', 'b'));
    assert.ifError(scmp('abc', 'b'));
    assert.ifError(scmp('e727d1464ae12436e899a726da5b2f11d8381b26', 'e727e1b80e448a213b392049888111e1779a52db'));
  });
  
  it('should not throw errors for non-strings', function() {
    assert.ifError(scmp('a', {}));
    assert.ifError(scmp({}, 'b'));
    assert.ifError(scmp(1, 2));
    assert.ifError(scmp(undefined, 2));
    assert.ifError(scmp(null, 2));
  });
});
