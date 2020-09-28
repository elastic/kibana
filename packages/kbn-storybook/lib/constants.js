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
const { REPO_ROOT } = require('@kbn/utils');

exports.ASSET_DIR = resolve(REPO_ROOT, 'built_assets/storybook');
exports.CURRENT_CONFIG = resolve(exports.ASSET_DIR, 'current.config.js');
exports.STORY_ENTRY_PATH = resolve(exports.ASSET_DIR, 'stories.entry.js');
exports.DLL_DIST_DIR = resolve(exports.ASSET_DIR, 'dll');
exports.DLL_NAME = 'storybook_dll';
