import { resolve } from 'path';

import expect from 'expect.js';
import { isEqual } from 'lodash';
import { findPluginSpecs } from '../find_plugin_specs';
import { PluginSpec } from '../plugin_spec';

const PLUGIN_FIXTURES = resolve(__dirname, 'fixtures/plugins');
const CONFLICT_FIXTURES = resolve(__dirname, 'fixtures/conflicts');

describe('plugin discovery', () => {
  describe('findPluginSpecs()', function () {
    this.timeout(10000);

    describe('spec$', () => {
      it('finds specs for specified plugin paths', async () => {
        const { spec$ } = findPluginSpecs({
          plugins: {
            paths: [
              resolve(PLUGIN_FIXTURES, 'foo'),
              resolve(PLUGIN_FIXTURES, 'bar'),
              resolve(PLUGIN_FIXTURES, 'broken'),
            ]
          }
        });

        const specs = await spec$.toArray().toPromise();
        expect(specs).to.have.length(3);
        specs.forEach(spec => {
          expect(spec).to.be.a(PluginSpec);
        });
        expect(specs.map(s => s.getId()).sort())
          .to.eql(['bar:one', 'bar:two', 'foo']);
      });

      it('finds all specs in scanDirs', async () => {
        const { spec$ } = findPluginSpecs({
          // used to ensure the dev_mode plugin is enabled
          env: 'development',

          plugins: {
            scanDirs: [PLUGIN_FIXTURES]
          }
        });

        const specs = await spec$.toArray().toPromise();
        expect(specs).to.have.length(3);
        specs.forEach(spec => {
          expect(spec).to.be.a(PluginSpec);
        });
        expect(specs.map(s => s.getId()).sort())
          .to.eql(['bar:one', 'bar:two', 'foo']);
      });

      it('does not find disabled plugins', async () => {
        const { spec$ } = findPluginSpecs({
          'bar:one': {
            enabled: false
          },

          plugins: {
            paths: [
              resolve(PLUGIN_FIXTURES, 'foo'),
              resolve(PLUGIN_FIXTURES, 'bar'),
              resolve(PLUGIN_FIXTURES, 'broken'),
            ]
          }
        });

        const specs = await spec$.toArray().toPromise();
        expect(specs).to.have.length(2);
        specs.forEach(spec => {
          expect(spec).to.be.a(PluginSpec);
        });
        expect(specs.map(s => s.getId()).sort())
          .to.eql(['bar:two', 'foo']);
      });

      it('dedupes duplicate packs', async () => {
        const { spec$ } = findPluginSpecs({
          plugins: {
            scanDirs: [PLUGIN_FIXTURES],
            paths: [
              resolve(PLUGIN_FIXTURES, 'foo'),
              resolve(PLUGIN_FIXTURES, 'foo'),
              resolve(PLUGIN_FIXTURES, 'bar'),
              resolve(PLUGIN_FIXTURES, 'bar'),
              resolve(PLUGIN_FIXTURES, 'broken'),
              resolve(PLUGIN_FIXTURES, 'broken'),
            ],
          }
        });

        const specs = await spec$.toArray().toPromise();
        expect(specs).to.have.length(3);
        specs.forEach(spec => {
          expect(spec).to.be.a(PluginSpec);
        });
        expect(specs.map(s => s.getId()).sort())
          .to.eql(['bar:one', 'bar:two', 'foo']);
      });

      describe('conflicting plugin spec ids', () => {
        it('fails with informative message', async () => {
          const { spec$ } = findPluginSpecs({
            plugins: {
              scanDirs: [],
              paths: [
                resolve(CONFLICT_FIXTURES, 'foo'),
              ],
            }
          });

          try {
            await spec$.toArray().toPromise();
            throw new Error('expected spec$ to throw an error');
          } catch (error) {
            expect(error.message).to.contain('Multple plugins found with the id "foo"');
            expect(error.message).to.contain(CONFLICT_FIXTURES);
          }
        });
      });
    });

    describe('packageJson$', () => {
      const checkPackageJsons = (packageJsons) => {
        expect(packageJsons).to.have.length(2);
        const package1 = packageJsons.find(packageJson => isEqual({
          directoryPath: resolve(PLUGIN_FIXTURES, 'foo'),
          contents: {
            name: 'foo',
            version: 'kibana'
          }
        }, packageJson));
        expect(package1).to.be.an(Object);
        const package2 = packageJsons.find(packageJson => isEqual({
          directoryPath: resolve(PLUGIN_FIXTURES, 'bar'),
          contents: {
            name: 'foo',
            version: 'kibana'
          }
        }, packageJson));
        expect(package2).to.be.an(Object);
      };

      it('finds packageJson for specified plugin paths', async () => {
        const { packageJson$ } = findPluginSpecs({
          plugins: {
            paths: [
              resolve(PLUGIN_FIXTURES, 'foo'),
              resolve(PLUGIN_FIXTURES, 'bar'),
              resolve(PLUGIN_FIXTURES, 'broken'),
            ]
          }
        });

        const packageJsons = await packageJson$.toArray().toPromise();
        checkPackageJsons(packageJsons);
      });

      it('finds all packageJsons in scanDirs', async () => {
        const { packageJson$ } = findPluginSpecs({
          // used to ensure the dev_mode plugin is enabled
          env: 'development',

          plugins: {
            scanDirs: [PLUGIN_FIXTURES]
          }
        });

        const packageJsons = await packageJson$.toArray().toPromise();
        checkPackageJsons(packageJsons);
      });

      it('dedupes duplicate packageJson', async () => {
        const { packageJson$ } = findPluginSpecs({
          plugins: {
            scanDirs: [PLUGIN_FIXTURES],
            paths: [
              resolve(PLUGIN_FIXTURES, 'foo'),
              resolve(PLUGIN_FIXTURES, 'foo'),
              resolve(PLUGIN_FIXTURES, 'bar'),
              resolve(PLUGIN_FIXTURES, 'bar'),
              resolve(PLUGIN_FIXTURES, 'broken'),
              resolve(PLUGIN_FIXTURES, 'broken'),
            ],
          }
        });

        const packageJsons = await packageJson$.toArray().toPromise();
        checkPackageJsons(packageJsons);
      });
    });
  });
});
