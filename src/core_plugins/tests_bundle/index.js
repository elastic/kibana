import { union } from 'lodash';

import { fromRoot } from '../../utils';

import findSourceFiles from './find_source_files';
import { createTestEntryTemplate } from './tests_entry_template';

export default (kibana) => {
  return new kibana.Plugin({
    config: (Joi) => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        instrument: Joi.boolean().default(false),
        pluginId: Joi.string()
      }).default();
    },

    uiExports: {
      async __bundleProvider__(kbnServer) {
        let modules = [];

        const {
          config,
          uiApps,
          uiBundles,
          plugins,
          uiExports: {
            uiSettingDefaults = {}
          }
        } = kbnServer;

        const testGlobs = [
          'src/ui/public/**/*.js',
          '!src/ui/public/flot-charts/**/*',
        ];
        const testingPluginIds = config.get('tests_bundle.pluginId');

        if (testingPluginIds) {
          testGlobs.push('!src/ui/public/**/__tests__/**/*');
          testingPluginIds.split(',').forEach((pluginId) => {
            const plugin = plugins
              .find(plugin => plugin.id === pluginId);

            if (!plugin) {
              throw new Error('Invalid testingPluginId :: unknown plugin ' + pluginId);
            }

            // add the modules from all of this plugins apps
            for (const app of uiApps) {
              if (app.getPluginId() === pluginId) {
                modules = union(modules, app.getModules());
              }
            }

            testGlobs.push(`${plugin.publicDir}/**/__tests__/**/*.js`);
          });
        } else {
          // add the modules from all of the apps
          for (const app of uiApps) {
            modules = union(modules, app.getModules());
          }

          for (const plugin of plugins) {
            testGlobs.push(`${plugin.publicDir}/**/__tests__/**/*.js`);
          }
        }

        const testFiles = await findSourceFiles(testGlobs);
        for (const f of testFiles) modules.push(f);

        if (config.get('tests_bundle.instrument')) {
          uiBundles.addPostLoader({
            test: /\.js$/,
            exclude: /[\/\\](__tests__|node_modules|bower_components|webpackShims)[\/\\]/,
            loader: 'istanbul-instrumenter-loader'
          });
        }

        uiBundles.add({
          id: 'tests',
          modules,
          template: createTestEntryTemplate(uiSettingDefaults),
        });
      },

      __globalImportAliases__: {
        ng_mock$: fromRoot('src/test_utils/public/ng_mock'),
        'angular-mocks$': require.resolve('./webpackShims/angular-mocks'),
        fixtures: fromRoot('src/fixtures'),
        test_utils: fromRoot('src/test_utils/public'),
      }
    }
  });
};
