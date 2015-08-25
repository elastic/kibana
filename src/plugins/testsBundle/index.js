module.exports = (kibana) => {
  let { union } = require('lodash');

  let utils = require('requirefrom')('src/utils');
  let fromRoot = utils('fromRoot');
  let findSourceFiles = require('./findSourceFiles');

  return new kibana.Plugin({
    uiExports: {
      bundle: async (UiBundle, env, apps) => {

        let modules = [];

        // add the modules from all of the apps
        for (let app of apps) {
          modules = union(modules, app.getModules());
        }

        let testFiles = await findSourceFiles([
          'src/**/public/**/__tests__/**/*.js',
          'installedPlugins/*/public/**/__tests__/**/*.js'
        ]);

        for (let f of testFiles) modules.push(f);

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
