
var crypto = require('crypto');
var fs = require('fs');

/**
 * Get the md5 hash of a file.
 * @param  {String} path Path to file.
 * @return {String} md5 of file in hex format.
 */
exports.hashFile = function(path) {
  return crypto.createHash('md5').update(fs.readFileSync(path)).digest('hex');
};