import expect from 'expect.js';
import tempy from 'tempy';
import copy from 'cpy';
import { resolve } from 'path';
import globby from 'globby';

import { buildProductionProjects } from '../';
import { getProjects } from '../../utils/projects';

// This is specifically a Mocha test instead of a Jest test because it's slow
// and more integration-y, as we're trying to not add very slow tests to our
// Jest unit tests.

describe('kbn-build production', function() {
  it('builds and copies projects for production', async function() {
    this.timeout(60 * 1000);

    const tmpDir = tempy.directory();
    const buildRoot = tempy.directory();
    const fixturesPath = resolve(__dirname, 'fixtures');

    // console.log({ tmpDir, buildRoot, __dirname });

    // Copy all the test fixtures into a tmp dir, as we will be mutating them
    await copy(['**/*'], tmpDir, {
      cwd: fixturesPath,
      parents: true,
      nodir: true,
      dot: true,
    });

    const projects = await getProjects(tmpDir, ['./packages/*']);

    for (const project of projects.values()) {
      // This will both install dependencies and generate `yarn.lock` files
      await project.installDependencies({
        extraArgs: ['--silent', '--no-progress'],
      });
    }

    await buildProductionProjects({ kibanaRoot: tmpDir, buildRoot });

    const files = await globby(['**/*', '!**/node_modules/**'], {
      cwd: buildRoot,
    });

    expect(files).to.eql([
      'packages/bar/package.json',
      'packages/bar/src/index.js',
      'packages/bar/target/index.js',
      'packages/bar/yarn.lock',
      'packages/foo/package.json',
      'packages/foo/src/index.js',
      'packages/foo/target/index.js',
      'packages/foo/yarn.lock',
    ]);
  });
});
