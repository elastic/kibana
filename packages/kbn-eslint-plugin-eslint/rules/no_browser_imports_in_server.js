/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { rules } = require('@typescript-eslint/eslint-plugin');

/**
 * Keep browser-only UI libraries (@elastic/eui, React, and friends) out of
 * Kibana server code: a single value import of the @elastic/eui barrel loads
 * 1,100+ modules of React components into the Node.js process. Type-only
 * imports are allowed (they are erased at runtime). A dedicated rule id keeps
 * these bans independent from local no-restricted-imports overrides.
 */
module.exports = rules['no-restricted-imports'];
