var glob = require('../');

glob([
  'files/**',
  '!files/x/**',
  'files/x/z.txt'
], {
  mark: true
}, function(err, files) {
  console.log(err || files);
});
