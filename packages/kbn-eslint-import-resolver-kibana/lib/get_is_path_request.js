// "path" imports point to a specific location and don't require
// module directory resolution. This RegExp should capture import
// statements that:
//
//  - start with `./`
//  - start with `../`
//  - equal `..`
//  - equal `.`
//  - start with `C:\`
//  - start with `C:/`
//  - start with `/`
//
const PATH_IMPORT_RE = /^(?:\.\.?(?:\/|$)|\/|([A-Za-z]:)?[/\\])/;

exports.getIsPathRequest = function(source) {
  return PATH_IMPORT_RE.test(source);
};
