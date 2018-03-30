import { resolve } from 'path';

import expect from 'expect.js';
import { findPluginSpecs } from '../find_plugin_specs';
import { PluginSpec } from '../plugin_spec';

const PLUGIN_FIXTURES = resolve(__dirname, 'fixtures/plugins');

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
              resolve(PLUGIN_FIXTURES, 'bar')
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
    });

    describe('packageJson$', () => {
      it('finds packageJson for specified plugin paths', async () => {
        const { packageJson$ } = findPluginSpecs({
          plugins: {
            paths: [
              resolve(PLUGIN_FIXTURES, 'foo'),
              resolve(PLUGIN_FIXTURES, 'bar'),
            ]
          }
        });

        const packageJsons = await packageJson$.toArray().toPromise();
        expect(packageJsons).to.have.length(2);
        packageJsons.forEach(spec => {
          expect(spec).to.have.property('directoryPath');
          expect(spec).to.have.property('contents');
        });
      });
    });

  });
});
