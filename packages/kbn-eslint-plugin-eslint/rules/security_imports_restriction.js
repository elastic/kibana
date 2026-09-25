/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Linter = require('eslint').Linter;

const coreRule = new Linter().getRules().get('no-restricted-imports');

/**
 * Keep Kibana's security-oriented import bans independent from local
 * no-restricted-imports overrides.
 */
module.exports = coreRule;
