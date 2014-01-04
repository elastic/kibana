(function () {
  'use strict';

  /**
   * Bootstrap require with the needed config
   */
  require.config({
    baseUrl: 'app',
    paths: {
      _:            '../vendor/lodash',
      ace:          '../vendor/ace/ace',
      bootstrap:    '../vendor/bootstrap/js/bootstrap',
      jquery:       '../vendor/jquery/jquery-1.8.3',
      'jquery-ui':  '../vendor/jquery/jquery-ui-1.9.2.custom.min',
      moment:       '../vendor/moment',
      zeroclip:     '../vendor/zero_clipboard/zero_clipboard',
    },
    map: {
      '*': {
        css: '../vendor/require/css/css'
      }
    },
    shim: {
      jquery: {
        exports: 'jQuery'
      },
      'bootstrap': {
        deps: ['jquery'],
      },
      'jquery-ui': {
        deps: ['jquery', 'css!../vendor/jquery/jquery-ui-1.9.2.custom.min.css']
      },
      ace: {
        exports: 'ace'
      }
    },
    waitSeconds: 60,
  });
})();