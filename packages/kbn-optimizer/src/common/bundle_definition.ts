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

export const VALID_BUNDLE_TYPES = ['plugin' as const];

export interface BundleDefinition {
  readonly type: typeof VALID_BUNDLE_TYPES[0];
  /** Unique id for this bundle */
  readonly id: string;
  /** Webpack entry request for this plugin, relative to the contextDir */
  readonly entry: string;
  /** Absolute path to the plugin source directory */
  readonly contextDir: string;
  /** Absolute path to the root of the repository */
  readonly sourceRoot: string;
  /** Absolute path to the directory where output should be written */
  readonly outputDir: string;
}
