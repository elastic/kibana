/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// sources are pre-transpiled during the build, no runtime transpiler needed
require('./setup_env');

// Kibana's files ship with source maps, only loaded when enabled since they cost memory.
if (process.env.KBN_ENABLE_SERVER_SOURCE_MAPS === 'true') {
  var resolveStackTrace = require('./source_maps').createStackTraceResolver(
    require('@kbn/repo-info').REPO_ROOT
  );
  var prepareStackTrace = Error.prepareStackTrace;
  // Resolves only the frames, since error messages can contain anything.
  Error.prepareStackTrace = function (error, frames) {
    var message = prepareStackTrace(error, []);
    var stack = prepareStackTrace(error, frames);
    return stack.startsWith(message)
      ? message + resolveStackTrace(stack.slice(message.length))
      : stack;
  };
}
