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

import { resolve } from 'path';

import { getProjectPaths } from '../config';
import { stripAnsiSnapshotSerializer } from '../test_helpers';
import { getProjects } from './projects';
import { renderProjectsTree } from './projects_tree';

const rootPath = resolve(`${__dirname}/__fixtures__/kibana`);

expect.addSnapshotSerializer(stripAnsiSnapshotSerializer);

test('handles projects with root folder', async () => {
  const projects = await getProjects(rootPath, ['.', 'packages/*']);

  const tree = await renderProjectsTree(rootPath, projects);
  expect(tree).toMatchSnapshot();
});

test('handles projects outside root folder', async () => {
  const projects = await getProjects(rootPath, ['.', 'packages/*', '../plugins/*']);

  const tree = await renderProjectsTree(rootPath, projects);
  expect(tree).toMatchSnapshot();
});

test('handles projects within projects outside root folder', async () => {
  const projectPaths = getProjectPaths({ rootPath });
  const projects = await getProjects(rootPath, projectPaths);

  const tree = await renderProjectsTree(rootPath, projects);
  expect(tree).toMatchSnapshot();
});
