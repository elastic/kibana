/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const { resolve } = require('path');

exports.ROOT_DIR = resolve(__dirname, '../../');
exports.SOURCE_DIR = resolve(exports.ROOT_DIR, 'src');
exports.BUILD_DIR = resolve(exports.ROOT_DIR, 'target');

exports.PLUGIN_SOURCE_DIR = resolve(exports.SOURCE_DIR, 'plugin');
exports.PLUGIN_BUILD_DIR = resolve(exports.BUILD_DIR, 'plugin');

exports.WEBPACK_CONFIG_PATH = require.resolve('./webpack.config');
exports.BABEL_PRESET_PATH = require.resolve('@kbn/babel-preset/webpack_preset');

