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

    expect(() => root.ensureValidProjectDependency(foo, false)).not.toThrow();
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

    expect(() => root.ensureValidProjectDependency(foo, false)).toThrowErrorMatchingSnapshot();
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

    expect(() => root.ensureValidProjectDependency(foo, false)).toThrowErrorMatchingSnapshot();
  });

  test('using version in workspace', () => {
    const root = createProjectWith({
      dependencies: {
        foo: '1.0.0',
      },
    });

    const foo = createProjectWith(
      {
        name: 'foo',
        version: '1.0.0',
      },
      'packages/foo'
    );

    expect(() => root.ensureValidProjectDependency(foo, true)).not.toThrow();
  });

  test('using wrong version in workspace', () => {
    const root = createProjectWith({
      dependencies: {
        foo: '1.0.0',
      },
    });

    const foo = createProjectWith(
      {
        name: 'foo',
        version: '2.0.0',
      },
      'packages/foo'
    );

    expect(() => root.ensureValidProjectDependency(foo, true)).toThrowErrorMatchingSnapshot();
  });

  test('using link: in workspace', () => {
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

    expect(() => root.ensureValidProjectDependency(foo, true)).toThrowErrorMatchingSnapshot();
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

describe('#getIntermediateBuildDirectory', () => {
  test('is the same as the project path when not specified', () => {
    const project = createProjectWith({}, 'packages/my-project');
    const path = project.getIntermediateBuildDirectory();

    expect(path).toBe(project.path);
  });

  test('appends the `intermediateBuildDirectory` to project path when specified', () => {
    const project = createProjectWith(
      {
        kibana: {
          build: {
            intermediateBuildDirectory: 'quux',
          },
        },
      },
      'packages/my-project'
    );
    const path = project.getIntermediateBuildDirectory();

    expect(path).toBe(join(project.path, 'quux'));
  });
});
