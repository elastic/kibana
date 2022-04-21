/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { ImportResolver } = require('@kbn/import-resolver');
const { REPO_ROOT } = require('@kbn/utils');
const resolver = ImportResolver.create(REPO_ROOT, {
  disableTypesFallback: true,
});

module.exports = (request, options) => {
  const result = resolver.resolve(request, options.basedir);

  if (result?.type === 'built-in') {
    return request;
  }

  if (result?.type === 'file') {
    return result.absolute;
  }

  return options.defaultResolver(request, options);
};
