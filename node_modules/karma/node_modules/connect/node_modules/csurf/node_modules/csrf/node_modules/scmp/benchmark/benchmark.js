var scmp = require('../');

suite('scmp', function() {
  var HASH1 = 'e727d1464ae12436e899a726da5b2f11d8381b26';
  var HASH2 = 'f727d1464ae12436e899a726da5b2f11d8381b26';
  
  bench('short-circuit compares', function() {
    HASH1 === HASH2;
  });
  
  bench('scmp compares', function() {
    scmp(HASH1, HASH2);
  });
  
});
