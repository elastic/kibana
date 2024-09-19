/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
