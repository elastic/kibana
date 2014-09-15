define(function (require) {
  var module = require('modules').get('kibana/vislib', ['kibana']);
  
  require('services/private');

  module.service('d3', function () {
    return require('d3');
  });

  // Kibana visualization library
  module.service('visLib', function (Private) {
    return {
      version: '0.0.0',
      Vis: Private(require('components/vislib/vis'))
    };
  });
});
