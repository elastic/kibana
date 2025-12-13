/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { format } = require('util');

const noop = () => {
  //
};

/**
 * @param {string} filename
 * @param {boolean} enabled
 * @returns {( cb:( ) => any ) => void }
 */
exports.createDebugFn = (filename, enabled) => {
  if (!enabled) {
    return noop;
  }

  return (cb) => {
    const data = cb();
    console.log(`[${filename}] ${format(data)}`);
  };
};
