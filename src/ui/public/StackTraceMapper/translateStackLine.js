let _ = require('lodash');

module.exports = function (map, match, filename, line, col) {
  if (!map) return match;

  let position = {
    line: parseFloat(line) || 0,
    column: parseFloat(col) || 0
  };

  let srcPosition = map.smc.originalPositionFor(position);
  if (!srcPosition || !srcPosition.source) return match;

  let srcFilename = srcPosition.source;
  let srcLine = srcPosition.line;
  let srcCol = srcPosition.column;

  if (srcCol === 0 && position.column) {
    // TODO: teach sourcemaps correct column
    //
    // since our bundles are not yet minified we can copy the column
    // this won't always be the case
    srcCol = position.column;
  }

  // fold the components into the original match, so that supporting
  // characters (parens, periods, etc) from the format are kept, and so
  // we don't accidentally replace the wrong part we use splitting and consumption
  let resp = '';
  let remainingResp = match;
  let fold = function (replace, replacement) {
    let wrappingContent = remainingResp.split(replace);
    resp += wrappingContent.shift() + replacement;
    remainingResp = wrappingContent.join(replace);
  };

  fold(filename, srcFilename);
  fold(line, srcLine);
  if (_.isString(col)) fold(col, srcCol);
  return resp;
};
