/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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

exports.getIsPathRequest = function (source) {
  return PATH_IMPORT_RE.test(source);
};
