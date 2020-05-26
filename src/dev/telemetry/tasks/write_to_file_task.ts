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

import * as path from 'path';
import { writeFileAsync } from '../utils';
import { TaskContext } from './task_context';

export function writeToFileTask({ roots }: TaskContext) {
  return roots.map((root) => ({
    task: async () => {
      const fullPath = path.resolve(process.cwd(), root.config.output);
      if (root.mapping && Object.keys(root.mapping.properties).length > 0) {
        const serializedMapping = JSON.stringify(root.mapping, null, 2).concat('\n');
        await writeFileAsync(fullPath, serializedMapping);
      }
    },
    title: `Writing mapping for ${root.config.root}`,
  }));
}
