'use strict';

module.exports = function (server, kbnServer) {
  let resolve = require('path').resolve;
  let extname = require('path').extname;
  let relative = require('path').relative;
  let Boom = require('boom');

  let TestBundler = require('./TestBundler')(server, kbnServer);

  let state = null;
  server.decorate('reply', 'renderTestPart', function (path, part, mimeType) {
    let reply = this;

    if (!state || state.path !== path) {
      state = { path: path };
    }

    if (!state.bundler) {
      state.bundler = new TestBundler(path);
      state.promise = null;
      state.complete = false;
    }

    if (!state.promise || (part === 'bundle' && state.complete)) {
      state.promise = state.bundler.render();
      state.complete = false;
      state.promise.then(function () { state.complete = true; });
    }

    state.promise.then(function (output) {
      if (!output || !output.bundle) {
        return reply(Boom.create(500, 'failed to build test bundle'));
      }

      return reply(output[part]).type(mimeType);
    }, reply);
  });
};
