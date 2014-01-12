(function () {
  'use strict';

  /**
   * Bootstrap require with the needed config
   */
  require.config({
    baseUrl: 'app',
    paths: {
      _:            '../vendor/lodash',
      bootstrap:    '../vendor/bootstrap/js/bootstrap',
      jquery:       '../vendor/jquery/jquery-1.8.3',
      'jquery-ui':  '../vendor/jquery/jquery-ui-1.9.2.custom.min',
      moment:       '../vendor/moment',
      zeroclip:     '../vendor/zero_clipboard/zero_clipboard',
      'ace': '../vendor/ace/ace',
      'ace_mode_json': '../vendor/ace/mode-json',
      'ace_ext_language_tools': '../vendor/ace/ext-language_tools',
    },
    map: {
      '*': {
        css: '../vendor/require/css/css'
      }
    },
    shim: {
      ace: {
        exports: 'ace'
      },
      ace_mode_json: {
        deps: ['ace']
      },
      ace_ext_language_tools: {
        deps: ['ace']
      },
      jquery: {
        exports: 'jQuery'
      },
      'bootstrap': {
        deps: ['jquery'],
      },
      'jquery-ui': {
        deps: ['jquery', 'css!../vendor/jquery/jquery-ui-1.9.2.custom.min.css']
      }
    },
    waitSeconds: 60,
  });
})();