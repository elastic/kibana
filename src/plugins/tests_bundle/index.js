import { union } from 'lodash';
import findSourceFiles from './find_source_files';
module.exports = (kibana) => {

  let utils = require('requirefrom')('src/utils');
  let fromRoot = utils('fromRoot');

  return new kibana.Plugin({
    config: (Joi) => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        instrument: Joi.boolean().default(false)
      }).default();
    },

    uiExports: {
      bundle: async (UiBundle, env, apps, plugins) => {
        let modules = [];
        let config = kibana.config;

        // add the modules from all of the apps
        for (let app of apps) {
          modules = union(modules, app.getModules());
        }

        const testGlobs = [
          'src/ui/public/**/__tests__/**/*.js',
        ];

        for (const plugin of plugins) {
          testGlobs.push(`${plugin.publicDir}/**/__tests__/**/*.js`);
        }

        const testFiles = await findSourceFiles(testGlobs);

        for (let f of testFiles) modules.push(f);

        if (config.get('testsBundle.instrument')) {
          env.addPostLoader({
            test: /\.jsx?$/,
            exclude: /[\/\\](__tests__|node_modules|bower_components|webpackShims)[\/\\]/,
            loader: 'istanbul-instrumenter'
          });
        }

        return new UiBundle({
          id: 'tests',
          modules: modules,
          template: require('./tests_entry_template'),
          env: env
        });
      },

      modules: {
        ngMock$: fromRoot('src/plugins/devMode/public/ngMock'),
        fixtures: fromRoot('src/fixtures'),
        testUtils: fromRoot('src/testUtils'),
        'angular-mocks': {
          path: require.resolve('angular-mocks'),
          imports: 'angular'
        },
      }
    }
  });
};
