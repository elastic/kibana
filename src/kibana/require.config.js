(function () {
  var config = {
    baseUrl: 'kibana',
    paths: {},
    shim: {
      angular: {
        deps: ['jquery'],
        exports: 'angular'
      }
    },
    waitSeconds: 60
  };

  var bowerComponents = [
    'd3',
    ['lodash', 'dist/lodash'],
    'jquery',
    'angular',
    'angular-route',
    'elasticsearch'
  ];

  bowerComponents.forEach(function (name) {
    var path = '../bower_components/';
    if (typeof name === 'object') {
      path += name[0] + '/' + name[1];
      name = name[0];
    } else {
      path += name + '/' + name;
    }
    config.paths[name] = path;

    if (name.match(/^angular-/)) {
      config.shim[name] = {
        deps: ['angular']
      };
    }
  });

  require.config(config);
}());