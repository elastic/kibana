define(function (require, module, exports) {
  require('plugins/doc/controllers/doc');

  var apps = require('registry/apps');
  apps.register(function DocAppModule() {
    return {
      id: 'doc',
      name: 'Doc Viewer',
      order: -1
    };
  });
});