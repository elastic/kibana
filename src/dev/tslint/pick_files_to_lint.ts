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

import { ToolingLog } from '@kbn/dev-utils';
import minimatch from 'minimatch';

import { File } from '../file';

export const IGNORED_PATHS = ['common/core_api_review/kibana.api.ts'];

export function pickFilesToLint(log: ToolingLog, files: File[]) {
  return files.filter(
    file =>
      file.isTypescript() &&
      !file.isFixture() &&
      !IGNORED_PATHS.some(glob => minimatch(file.getRelativePath(), glob, { dot: true }))
  );
}
