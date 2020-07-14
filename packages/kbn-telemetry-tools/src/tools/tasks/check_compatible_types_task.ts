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

import { TaskContext } from './task_context';
import { checkCompatibleTypeDescriptor } from '../check_collector_integrity';

export function checkCompatibleTypesTask({ reporter, roots }: TaskContext) {
  return roots.map((root) => ({
    task: async () => {
      if (root.parsedCollections) {
        const differences = checkCompatibleTypeDescriptor(root.parsedCollections);
        const reporterWithContext = reporter.withContext({ name: root.config.root });
        if (differences.length) {
          reporterWithContext.report(
            `${JSON.stringify(
              differences,
              null,
              2
            )}. \nPlease fix the collectors and run the check again.`
          );
          throw reporter;
        }
      }
    },
    title: `Checking in ${root.config.root}`,
  }));
}
