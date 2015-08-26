module.exports = (kibana) => {
  let { union } = require('lodash');

  let utils = require('requirefrom')('src/utils');
  let fromRoot = utils('fromRoot');
  let findSourceFiles = require('./findSourceFiles');

  return new kibana.Plugin({
    config: (Joi) => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        instrument: Joi.boolean().default(false)
      }).default();
    },

    uiExports: {
      bundle: async (UiBundle, env, apps) => {
        let modules = [];
        let config = kibana.config;

        // add the modules from all of the apps
        for (let app of apps) {
          modules = union(modules, app.getModules());
        }

        let testFiles = await findSourceFiles([
          'src/**/public/**/__tests__/**/*.js',
          'installedPlugins/*/public/**/__tests__/**/*.js'
        ]);

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
          template: require('./testsEntryTemplate'),
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
