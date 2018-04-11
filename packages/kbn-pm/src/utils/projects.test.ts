import { resolve } from 'path';

import {
  getProjects,
  buildProjectGraph,
  topologicallyBatchProjects,
  includeTransitiveProjects,
  ProjectMap,
  ProjectGraph,
} from './projects';
import { Project } from './project';
import { getProjectPaths } from '../config';

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

  test('includes additional projects in package.json', async () => {
    const projectPaths = getProjectPaths(rootPath, {});
    const projects = await getProjects(rootPath, projectPaths);

    const expectedProjects = [
      'kibana',
      'bar',
      'foo',
      'with-additional-projects',
      'quux',
      'baz',
    ];

    expect([...projects.keys()]).toEqual(
      expect.arrayContaining(expectedProjects)
    );
    expect(projects.size).toBe(expectedProjects.length);
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

    const expected: { [k: string]: string[] } = {};
    for (const [projectName, projects] of graph.entries()) {
      expected[projectName] = projects.map((project: Project) => project.name);
    }

    expect(expected).toMatchSnapshot();
  });
});

describe('#topologicallyBatchProjects', () => {
  let projects: ProjectMap;
  let graph: ProjectGraph;
  beforeEach(async () => {
    projects = await getProjects(rootPath, ['.', 'packages/*', '../plugins/*']);
    graph = buildProjectGraph(projects);
  });

  test('batches projects topologically based on their project dependencies', async () => {
    const batches = topologicallyBatchProjects(projects, graph);

    const expectedBatches = batches.map(batch =>
      batch.map(project => project.name)
    );

    expect(expectedBatches).toMatchSnapshot();
  });

  test('batches projects topologically even if graph contains projects not presented in the project map', async () => {
    // Make sure that the project we remove really existed in the projects map.
    expect(projects.delete('foo')).toBe(true);

    const batches = topologicallyBatchProjects(projects, graph);

    const expectedBatches = batches.map(batch =>
      batch.map(project => project.name)
    );

    expect(expectedBatches).toMatchSnapshot();
  });
});

describe('#includeTransitiveProjects', () => {
  test('includes transitive dependencies for Kibana package', async () => {
    const projects = await getProjects(rootPath, ['.', 'packages/*']);

    const kibana = projects.get('kibana')!;
    const withTransitive = includeTransitiveProjects([kibana], projects);

    expect([...withTransitive.keys()]).toEqual(['kibana', 'foo']);
  });

  test('handles multiple projects with same transitive dep', async () => {
    const projects = await getProjects(rootPath, ['.', 'packages/*']);

    const kibana = projects.get('kibana')!;
    const bar = projects.get('bar')!;
    const withTransitive = includeTransitiveProjects([kibana, bar], projects);

    expect([...withTransitive.keys()]).toEqual(['kibana', 'bar', 'foo']);
  });

  test('handles projects with no deps', async () => {
    const projects = await getProjects(rootPath, ['.', 'packages/*']);

    const foo = projects.get('foo')!;
    const withTransitive = includeTransitiveProjects([foo], projects);

    expect([...withTransitive.keys()]).toEqual(['foo']);
  });

  test('includes dependencies of dependencies', async () => {
    const projects = await getProjects(rootPath, [
      '.',
      'packages/*',
      '../plugins/*',
    ]);

    const quux = projects.get('quux')!;
    const withTransitive = includeTransitiveProjects([quux], projects);

    expect([...withTransitive.keys()]).toEqual(['quux', 'bar', 'baz', 'foo']);
  });
});
