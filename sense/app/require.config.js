/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



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
      'ace_ext_searchbox': '../vendor/ace/ext-searchbox',
      'analytics': '../../common/analytics'
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
