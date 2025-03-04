/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @typedef {import('./types').TransformConfig} TransformConfig */

const { getBabelOptions } = require('./options');
const { transformCode } = require('./sync_transform');
const { withFastAsyncTransform } = require('./fast_async_transformer');

module.exports = { transformCode, getBabelOptions, withFastAsyncTransform };
