const { resolve } = require('path');

const { debug } = require('./debug');
const { getPlugins } = require('./get_plugins');

exports.getWebpackConfig = function(kibanaPath, projectRoot, config) {
  const fromKibana = (...path) => resolve(kibanaPath, ...path);

  const alias = {
    // Kibana defaults https://github.com/elastic/kibana/blob/6998f074542e8c7b32955db159d15661aca253d7/src/ui/ui_bundler_env.js#L30-L36
    ui: fromKibana('src/ui/public'),
    ui_framework: fromKibana('ui_framework'),
    test_harness: fromKibana('src/test_harness/public'),
    querystring: 'querystring-browser',
    moment$: fromKibana('webpackShims/moment'),
    'moment-timezone$': fromKibana('webpackShims/moment-timezone'),

    // Dev defaults for test bundle https://github.com/elastic/kibana/blob/6998f074542e8c7b32955db159d15661aca253d7/src/core_plugins/tests_bundle/index.js#L73-L78
    ng_mock$: fromKibana('src/test_utils/public/ng_mock'),
    'angular-mocks$': fromKibana(
      'src/core_plugins/tests_bundle/webpackShims/angular-mocks.js'
    ),
    fixtures: fromKibana('src/fixtures'),
    test_utils: fromKibana('src/test_utils/public'),
  };

  getPlugins(config, kibanaPath, projectRoot).forEach(plugin => {
    alias[`plugins/${plugin.name}`] = plugin.publicDirectory;
  });

  debug('Webpack resolved aliases', alias);

  return {
    context: kibanaPath,
    resolve: {
      extensions: ['.js', '.json'],
      mainFields: ['browser', 'main'],
      modules: [
        'webpackShims',
        'node_modules',
        fromKibana('webpackShims'),
        fromKibana('node_modules'),
      ],
      alias,
      unsafeCache: true,
    },
  };
};
