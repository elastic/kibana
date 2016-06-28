
var gather = require('gather-stream');
var fs = require('fs');

/**
 * Expose `read`.
 */

module.exports = read;

/**
 * Read from a `file`, falling back to stdin, and `callback(err, buffer)`.
 *
 * @param {String} file
 * @param {Function} callback
 */

function read (file, callback) {
  if ('function' == typeof file) callback = file, file = null;
  var stream = file ? fs.createReadStream(file) : process.stdin;
  stream.pipe(gather(callback));
}
