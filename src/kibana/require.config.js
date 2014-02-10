(function () {
  function bower(p) { return '../bower_components/' + p; }

  require.config({
    baseUrl: 'kibana',
    paths: {
      d3: bower('d3/d3'),
      lodash: bower('lodash/dist/lodash'),
      jquery: bower('jquery/jquery'),
      angular: bower('angular/angular'),
      'utils/event_emitter': bower('eventEmitter/EventEmitter')
    },
    shim: {
      angular: {
        deps: ['jquery'],
        exports: 'angular'
      }
    },
    waitSeconds: 60
  });
}());