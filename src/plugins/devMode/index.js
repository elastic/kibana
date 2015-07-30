module.exports = function (kibana) {
  if (!kibana.config.get('env.dev')) return;

  let utils = require('requirefrom')('src/utils');
  let fromRoot = utils('fromRoot');

  return new kibana.Plugin({
    uiExports: {
      spyModes: [
        'plugins/devMode/visDebugSpyPanel'
      ],

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
