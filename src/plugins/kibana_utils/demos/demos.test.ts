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

import { join } from 'path';
import { execSync } from 'child_process';

describe('demos', () => {
  describe('state containers', () => {
    test('counter demo works', () => {
      const demoFile = join(__dirname, 'state_containers', 'counter.ts');
      const result = execSync(`npx -q ts-node ${demoFile}`).toString('utf8');

      expect(Number(result)).toBe(10);
    });

    test('TodoMVC demo works', () => {
      const demoFile = join(__dirname, 'state_containers', 'todomvc.ts');
      const result = execSync(`npx -q ts-node ${demoFile}`).toString('utf8');

      const data = JSON.parse(result);
      expect(data).toEqual([
        { id: 0, text: 'Learning state containers', completed: true },
        { id: 1, text: 'Learning transitions...', completed: true },
      ]);
    });
  });
});
