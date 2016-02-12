import _ from 'lodash';

module.exports = function (map, match, filename, line, col) {
  if (!map) return match;

  var position = {
    line: parseFloat(line) || 0,
    column: parseFloat(col) || 0
  };

  var srcPosition = map.smc.originalPositionFor(position);
  if (!srcPosition || !srcPosition.source) return match;

  var srcFilename = srcPosition.source;
  var srcLine = srcPosition.line;
  var srcCol = srcPosition.column;

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
  var resp = '';
  var remainingResp = match;
  var fold = function (replace, replacement) {
    var wrappingContent = remainingResp.split(replace);
    resp += wrappingContent.shift() + replacement;
    remainingResp = wrappingContent.join(replace);
  };

  fold(filename, srcFilename);
  fold(line, srcLine);
  if (_.isString(col)) fold(col, srcCol);
  return resp;
};
