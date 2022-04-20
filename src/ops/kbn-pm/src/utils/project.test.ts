/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join, resolve } from 'path';

import { IPackageJson } from './package_json';
import { Project } from './project';

const rootPath = resolve(`${__dirname}/__fixtures__/kibana`);

const createProjectWith = (packageJson: IPackageJson, path = '') =>
  new Project(
    {
      name: 'kibana',
      version: '1.0.0',
      ...packageJson,
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
    dependencies: {
      foo: '1.2.3',
    },
    scripts: {
      test: 'jest',
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

    expect(() => root.ensureValidProjectDependency(foo)).toThrowErrorMatchingSnapshot();
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

    expect(() => root.ensureValidProjectDependency(foo)).toThrowErrorMatchingSnapshot();
  });
});

describe('#getExecutables()', () => {
  test('converts bin:string to an object with absolute paths', () => {
    const project = createProjectWith({
      bin: './bin/script.js',
    });

    expect(project.getExecutables()).toEqual({
      kibana: resolve(rootPath, 'bin/script.js'),
    });
  });

  test('resolves absolute paths when bin is an object', () => {
    const project = createProjectWith({
      bin: {
        script1: 'bin/script1.js',
        script2: './bin/script2.js',
      },
    });

    expect(project.getExecutables()).toEqual({
      script1: resolve(rootPath, 'bin/script1.js'),
      script2: resolve(rootPath, 'bin/script2.js'),
    });
  });

  test('returns empty object when bin is missing, or falsy', () => {
    expect(createProjectWith({}).getExecutables()).toEqual({});
    expect(createProjectWith({ bin: null }).getExecutables()).toEqual({});
    expect(createProjectWith({ bin: false }).getExecutables()).toEqual({});
    expect(createProjectWith({ bin: 0 }).getExecutables()).toEqual({});
  });

  test('throws CliError when bin is something strange', () => {
    expect(() => createProjectWith({ bin: 1 }).getExecutables()).toThrowErrorMatchingSnapshot();
  });
});
