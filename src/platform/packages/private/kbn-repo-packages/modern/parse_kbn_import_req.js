/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Parse an import request to a kbn import request, or undefined
 * if this doesn't represent a kbn import request
 *
 * @param {string} importReq
 * @returns {import('./types').KbnImportReq | undefined}
 */
function parseKbnImportReq(importReq) {
  if (!importReq.startsWith('@kbn/')) {
    return undefined;
  }

  if (importReq.endsWith('/')) {
    return parseKbnImportReq(importReq.slice(0, -1));
  }

  const [, id, ...target] = importReq.split('/');
  return {
    pkgId: `@kbn/${id}`,
    target: target.join('/'),
    full: importReq,
  };
}

module.exports = { parseKbnImportReq };
