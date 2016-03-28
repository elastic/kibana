var glob = require('../');

var t = Date.now();
glob([
  '**',
  '!**/*.js'
], {
  cwd: '/Users/jpillora/Code/Node/', /* folder with many files */
}, function(err, files) {
  console.log('found %s files in %sms', files.length, Date.now()-t);
});
