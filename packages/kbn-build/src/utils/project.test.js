import { resolve, join } from 'path';

import { Project } from './project';

const rootPath = resolve(`${__dirname}/__fixtures__/kibana`);

const createProjectWith = (fields, path = '') =>
  new Project(
    {
      name: 'kibana',
      version: '1.0.0',
      ...fields,
    },
    join(rootPath, path)
  );

describe('fromPath', () => {
  test('reads project.json at path and constructs Project', async () => {
    const kibana = await Project.fromPath(rootPath);

    expect(kibana.name).toBe('kibana');
  });
});

test('fields', async () => {
  const kibana = createProjectWith({
    scripts: {
      test: 'jest',
    },
    dependencies: {
      foo: '1.2.3',
    },
  });

  expect(kibana.name).toBe('kibana');

  expect(kibana.hasDependencies()).toBe(true);
  expect(kibana.allDependencies).toEqual({ foo: '1.2.3' });

  expect(kibana.hasScript('test')).toBe(true);
  expect(kibana.hasScript('build')).toBe(false);
});

describe('#ensureValidProjectDependency', () => {
  test('valid link: version', async () => {
    const root = createProjectWith({
      dependencies: {
        foo: 'link:packages/foo',
      },
    });

    const foo = createProjectWith(
      {
        name: 'foo',
      },
      'packages/foo'
    );

    expect(() => root.ensureValidProjectDependency(foo)).not.toThrow();
  });

  test('using link:, but with wrong path', () => {
    const root = createProjectWith(
      {
        dependencies: {
          foo: 'link:wrong/path',
        },
      },
      rootPath
    );

    const foo = createProjectWith(
      {
        name: 'foo',
      },
      'packages/foo'
    );

    expect(() =>
      root.ensureValidProjectDependency(foo)
    ).toThrowErrorMatchingSnapshot();
  });

  test('using version instead of link:', () => {
    const root = createProjectWith(
      {
        dependencies: {
          foo: '1.0.0',
        },
      },
      rootPath
    );

    const foo = createProjectWith(
      {
        name: 'foo',
      },
      'packages/foo'
    );

    expect(() =>
      root.ensureValidProjectDependency(foo)
    ).toThrowErrorMatchingSnapshot();
  });
});
