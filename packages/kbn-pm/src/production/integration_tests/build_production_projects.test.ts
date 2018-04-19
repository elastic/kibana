import tempy from 'tempy';
import copy from 'cpy';
import { resolve, relative, join } from 'path';
import globby from 'globby';

import { buildProductionProjects } from '../build_production_projects';
import { getProjects } from '../../utils/projects';
import { readPackageJson } from '../../utils/package_json';

describe('kbn-pm production', function() {
  test(
    'builds and copies projects for production',
    async function() {
      const tmpDir = tempy.directory();
      const buildRoot = tempy.directory();
      const fixturesPath = resolve(__dirname, '__fixtures__');

      // Copy all the test fixtures into a tmp dir, as we will be mutating them
      await copy(['**/*'], tmpDir, {
        cwd: fixturesPath,
        parents: true,
        nodir: true,
        dot: true,
      });

      const projects = await getProjects(tmpDir, ['.', './packages/*']);

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

      expect(files.sort()).toMatchSnapshot();

      for (const file of files) {
        if (file.endsWith('package.json')) {
          expect(await readPackageJson(join(buildRoot, file))).toMatchSnapshot(
            file
          );
        }
      }
    },
    2 * 60 * 1000
  );
});
