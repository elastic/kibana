'use strict';

module.exports = function (kbnServer, server, config) {
  if (!config.get('env.dev')) return;

  let Boom = require('boom');
  let src = require('requirefrom')('src');
  let fromRoot = src('utils/fromRoot');
  let TestBundler = require('./TestBundler');

  let bundler = new TestBundler(kbnServer, fromRoot('src'));
  let renderPromise = false;
  let renderComplete = false;

  function send(reply, part, mimeType) {
    if (!renderPromise || (part === 'bundle' && renderComplete)) {
      renderPromise = bundler.render();
      renderComplete = false;
      renderPromise.then(function () { renderComplete = true; });
    }

    renderPromise.then(function (output) {
      if (!output || !output.bundle) {
        return reply(Boom.create(500, 'failed to build test bundle'));
      }

      return reply(output[part]).type(mimeType);
    }, reply);
  }

  server.route({
    path: '/bundles/tests.bundle.js',
    method: 'GET',
    handler: function (req, reply) {
      send(reply, 'bundle', 'application/javascript');
    }
  });

  server.route({
    path: '/bundles/tests.bundle.js.map',
    method: 'GET',
    handler: function (req, reply) {
      send(reply, 'sourceMap', 'text/plain');
    }
  });

  server.route({
    path: '/bundles/tests.bundle.style.css',
    method: 'GET',
    handler: function (req, reply) {
      send(reply, 'style', 'text/css');
    }
  });
};
