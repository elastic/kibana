import { resolve } from 'path';

import {
  getProjects,
  buildProjectGraph,
  topologicallyBatchProjects,
} from './projects';

const rootPath = resolve(`${__dirname}/__fixtures__/kibana`);

describe('#getProjects', () => {
  test('find all packages in the packages directory', async () => {
    const projects = await getProjects(rootPath, ['packages/*']);

    const expectedProjects = ['bar', 'foo'];

    expect(projects.size).toBe(2);
    expect([...projects.keys()]).toEqual(
      expect.arrayContaining(expectedProjects)
    );
  });

  test('can specify root as a separate project', async () => {
    const projects = await getProjects(rootPath, ['.']);

    expect(projects.size).toBe(1);
    expect([...projects.keys()]).toEqual(['kibana']);
  });

  test('handles packages outside root', async () => {
    const projects = await getProjects(rootPath, ['../plugins/*']);

    const expectedProjects = ['baz', 'quux'];

    expect(projects.size).toBe(2);
    expect([...projects.keys()]).toEqual(
      expect.arrayContaining(expectedProjects)
    );
  });

  test('throws if multiple projects has the same name', async () => {
    await expect(
      getProjects(rootPath, ['../plugins/*', '../other-plugins/*'])
    ).rejects.toHaveProperty(
      'message',
      'There are multiple projects with the same name [baz]'
    );
  });
});

describe('#buildProjectGraph', () => {
  test('builds full project graph', async () => {
    const projects = await getProjects(rootPath, [
      '.',
      'packages/*',
      '../plugins/*',
    ]);
    const graph = buildProjectGraph(projects);

    const expected = {};
    for (const [projectName, projects] of graph.entries()) {
      expected[projectName] = projects.map(project => project.name);
    }

    expect(expected).toMatchSnapshot();
  });
});

describe('#topologicallyBatchProjects', () => {
  test('batches projects topologically based on their project dependencies', async () => {
    const projects = await getProjects(rootPath, [
      '.',
      'packages/*',
      '../plugins/*',
    ]);
    const graph = buildProjectGraph(projects);

    const batches = topologicallyBatchProjects(projects, graph);

    const expectedBatches = batches.map(batch =>
      batch.map(project => project.name)
    );

    expect(expectedBatches).toMatchSnapshot();
  });
});
