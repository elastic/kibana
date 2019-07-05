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

import { join, resolve } from 'path';

import { prepareExternalProjectDependencies } from './prepare_project_dependencies';

const packagesFixtures = resolve(__dirname, '__fixtures__/external_packages');

test('does nothing when Kibana `link:` dependencies', async () => {
  const projectPath = join(packagesFixtures, 'with_kibana_link_deps');

  // We're checking for undefined, but we don't really care about what's
  // returned, we only care about it resolving.
  await expect(prepareExternalProjectDependencies(projectPath)).resolves.toBeUndefined();
});

test('throws if non-Kibana `link` dependencies', async () => {
  const projectPath = join(packagesFixtures, 'with_other_link_deps');

  await expect(prepareExternalProjectDependencies(projectPath)).rejects.toThrow(
    'This plugin is using `link:` dependencies for non-Kibana packages'
  );
});
