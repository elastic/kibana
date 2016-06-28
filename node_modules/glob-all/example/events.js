var glob = require('../');

var g = glob([
  'files/**',
  '!files/x/**',
  'files/x/z.txt'
], function(err, files) {
  console.log(err || files);
});

g.on('match', function(f) {
  console.log('glob match: %s', f);
});

g.on('end', function() {
  console.log('globbing complete');
});