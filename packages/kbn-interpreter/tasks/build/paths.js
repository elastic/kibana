/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { resolve } = require('path');

exports.ROOT_DIR = resolve(__dirname, '../../');
exports.SOURCE_DIR = resolve(exports.ROOT_DIR, 'src');
exports.BUILD_DIR = resolve(exports.ROOT_DIR, 'target');

exports.BABEL_PRESET_PATH = require.resolve('@kbn/babel-preset/webpack_preset');
