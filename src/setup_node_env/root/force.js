/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

module.exports = function (argv) {
  var rootIndex = argv.indexOf('--allow-root');
  var force = rootIndex >= 0;
  if (force) argv.splice(rootIndex, 1);
  return force;
};
