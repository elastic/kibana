import { union } from 'lodash';
import defaultsProvider from '../../ui/settings/defaults';
import findSourceFiles from './find_source_files';
import { fromRoot } from '../../utils';

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
      bundle: async (UiBundle, env, apps, plugins) => {
        let modules = [];
        let config = kibana.config;

        const testGlobs = ['src/ui/public/**/*.js'];
        const testingPluginIds = config.get('tests_bundle.pluginId');

        if (testingPluginIds) {
          testGlobs.push('!src/ui/public/**/__tests__/**/*');
          testingPluginIds.split(',').forEach((pluginId) => {
            const plugin = plugins.byId[pluginId];
            if (!plugin) throw new Error('Invalid testingPluginId :: unknown plugin ' + pluginId);

            // add the modules from all of this plugins apps
            for (let app of plugin.apps) {
              modules = union(modules, app.getModules());
            }

            testGlobs.push(`${plugin.publicDir}/**/__tests__/**/*.js`);
          });
        } else {

          // add the modules from all of the apps
          for (let app of apps) {
            modules = union(modules, app.getModules());
          }

          for (const plugin of plugins) {
            testGlobs.push(`${plugin.publicDir}/**/__tests__/**/*.js`);
          }
        }

        const testFiles = await findSourceFiles(testGlobs);
        for (let f of testFiles) modules.push(f);

        if (config.get('tests_bundle.instrument')) {
          env.addPostLoader({
            test: /\.jsx?$/,
            exclude: /[\/\\](__tests__|node_modules|bower_components|webpackShims)[\/\\]/,
            loader: 'istanbul-instrumenter'
          });
        }

        env.defaultUiSettings = defaultsProvider();

        return new UiBundle({
          id: 'tests',
          modules: modules,
          template: require('./tests_entry_template'),
          env: env
        });
      },

      modules: {
        ng_mock$: fromRoot('src/core_plugins/dev_mode/public/ng_mock'),
        fixtures: fromRoot('src/fixtures'),
        test_utils: fromRoot('src/test_utils'),
        'angular-mocks': {
          path: require.resolve('angular-mocks'),
          imports: 'angular'
        },
      }
    }
  });
};
