var fs = require('fs');

/**
 * Expose `write`.
 */

module.exports = write;

/**
 * Write `contents` to a `file`, falling back to stdout.
 *
 * @param {String} file
 * @param {String} contents
 */

function write (file, contents) {
  if (1 == arguments.length) contents = file, file = null;
  if (file) return fs.writeFileSync(file, contents);
  process.stdout.write(contents);
}
