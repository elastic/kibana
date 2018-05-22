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
  const projects = await getProjects(rootPath, [
    '.',
    'packages/*',
    '../plugins/*',
  ]);

  const tree = await renderProjectsTree(rootPath, projects);
  expect(tree).toMatchSnapshot();
});

test('handles projects within projects outside root folder', async () => {
  const projectPaths = getProjectPaths(rootPath, {});
  const projects = await getProjects(rootPath, projectPaths);

  const tree = await renderProjectsTree(rootPath, projects);
  expect(tree).toMatchSnapshot();
});
