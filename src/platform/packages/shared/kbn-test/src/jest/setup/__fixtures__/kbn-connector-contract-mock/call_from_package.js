/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Stands in for @kbn/connector-contract-mock: its path matches the allow-list entry, and the
// callback runs below its frame, as Ajv's recursive schema compilation runs below the package.
const callFromPackage = (callback) => callback();

module.exports = { callFromPackage };
