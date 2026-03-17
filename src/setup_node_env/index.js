/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// development env setup includes babel/register after the env is initialized
require('./setup_env');

// restore < Node 16 default DNS lookup behavior
require('./dns_ipv4_first');

require('@kbn/babel-register').install();

require('@kbn/security-hardening');

// Patch zod v4 globalRegistry to use WeakMap instead of Map to prevent memory leaks
// eslint-disable-next-line @kbn/eslint/module_migration
var zodReg = require('zod/v4/core').globalRegistry;
zodReg._map = new WeakMap();
zodReg.clear = function () {
  zodReg._map = new WeakMap();
  zodReg._idmap = new Map();
  return this;
};
