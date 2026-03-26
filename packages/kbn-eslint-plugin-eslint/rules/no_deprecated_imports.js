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
 * This rule is used to prevent the use of deprecated imports in Kibana code.
 * It is a wrapper around the core ESLint rule `no-restricted-imports` with
 * a different id to avoid conflicts with the core rule.
 */
module.exports = coreRule;
