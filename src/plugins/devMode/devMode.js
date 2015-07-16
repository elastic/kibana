'use strict';

module.exports = function devModePlugin(kibana) {
  let _ = require('lodash');

  let istanbul = require('./istanbul');
  let kibanaSrcFilter = require('./kibanaSrcFilter');

  let fromRoot = require('../../utils/fromRoot');
  const ROOT = fromRoot('.');
  const SRC = fromRoot('src');
  const UI = fromRoot('src/ui');

  // return new kibana.Plugin({
  //   init: function (server, options) {
  //     server.ext('onPreHandler', istanbul({ root: SRC, displayRoot: SRC, filter: kibanaSrcFilter }));
  //     server.ext('onPreHandler', istanbul({ root: UI, displayRoot: SRC, filter: kibanaSrcFilter }));

  //     let activeBundle = null;

  //     server.route({
  //       path: '/specs',
  //       method: 'GET',
  //       handler: function (request, reply) {
  //         if (!activeBundle) {

  //           activeBundle = bundle().finally(function () {
  //             activeBundle = null;
  //           });
  //         }

  //         activeBundle.then(function (path) {
  //           return reply.file(path);
  //         }, reply);
  //       }
  //     });
  //   },

  //   uiExports: {
  //     spyModes: [
  //       'plugins/devMode/visDebugSpyPanel'
  //     ]
  //   }
  // });
};
