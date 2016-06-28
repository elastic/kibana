var glob = require('../');

var files = glob.sync([
  'files/x/y.txt',
  'files/**'
]);

console.log(files);


