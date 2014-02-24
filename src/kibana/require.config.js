(function () {
  var config = {
    baseUrl: 'kibana',
    paths: {
      courier: '../courier'
    },
    shim: {
      angular: {
        deps: ['jquery'],
        exports: 'angular'
      }
    },
    waitSeconds: 60
  };

  var bowerComponents = [
    'angular',
    'angular-route',
    ['async', 'lib/async'],
    'd3',
    ['elasticsearch', 'elasticsearch.angular'],
    'jquery',
    ['lodash', 'dist/lodash'],
    'moment'
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

    if (path.match(/angular/) && name !== 'angular') {
      config.shim[name] = {
        deps: ['angular']
      };
    }
  });

  require.config(config);
}());
