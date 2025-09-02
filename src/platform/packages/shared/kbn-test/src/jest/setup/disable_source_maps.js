/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Turn off expensive source-map mapping for stacks
Error.stackTraceLimit = 0;
// Undo source-map-support's hook so stacks are formatted by V8, not SMS
Object.defineProperty(Error, 'prepareStackTrace', { value: undefined, writable: true });

const Module = require('module');
const orig = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'source-map-support') {
    return {
      install() {
        //
      },
      resetRetrieveHandlers() {
        //
      },
    }; // no-ops
  }
  return orig.apply(this, arguments);
};
