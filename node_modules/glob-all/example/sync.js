var glob = require('../');

var files = glob.sync([
  'files/**',
  '!files/x/**',
  'files/x/z.txt'
]);

console.log(files);


