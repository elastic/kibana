var fs = require('fs');
var http = require('http');
var path = require('path');
var connect = require('connect');

var common = require('./middleware/common');
var runnerMiddleware = require('./middleware/runner');
var stripHostMiddleware = require('./middleware/strip_host');
var karmaMiddleware = require('./middleware/karma');
var sourceFilesMiddleware = require('./middleware/source_files');
var proxyMiddleware = require('./middleware/proxy');

var log = require('./logger').create('web-server');

var createCustomHandler = function(customFileHandlers, /* config.basePath */ basePath) {
  return function(request, response, next) {
    for (var i = 0; i < customFileHandlers.length; i++) {
      if (customFileHandlers[i].urlRegex.test(request.url)) {
        return customFileHandlers[i].handler(request, response, 'fake/static', 'fake/adapter',
            basePath, 'fake/root');
      }
    }

    return next();
  };
};


var createWebServer = function(injector, emitter) {
  var serveStaticFile = common.createServeFile(fs, path.normalize(__dirname + '/../static'));
  var serveFile = common.createServeFile(fs);
  var filesPromise = new common.PromiseContainer();

  emitter.on('file_list_modified', function(files) {
    filesPromise.set(files);
  });

  // locals for webserver module
  // NOTE(vojta): figure out how to do this with DI
  injector = injector.createChild([{
    serveFile: ['value', serveFile],
    serveStaticFile: ['value', serveStaticFile],
    filesPromise: ['value', filesPromise]
  }]);

  var proxyMiddlewareInstance = injector.invoke(proxyMiddleware.create);

  var handler = connect()
      .use(injector.invoke(runnerMiddleware.create))
      .use(injector.invoke(stripHostMiddleware.create))
      .use(injector.invoke(karmaMiddleware.create))
      .use(injector.invoke(sourceFilesMiddleware.create))
      // TODO(vojta): extract the proxy into a plugin
      .use(proxyMiddlewareInstance)
      // TODO(vojta): remove, this is only here because of karma-dart
      // we need a better way of custom handlers
      .use(injector.invoke(createCustomHandler))
      .use(function(request, response) {
        common.serve404(response, request.url);
      });

  var server = http.createServer(handler);

  server.on('upgrade', function(req, socket, head) {
    log.debug('upgrade %s', req.url);
    proxyMiddlewareInstance.upgrade(req, socket, head);
  });

  return server;
};


// PUBLIC API
exports.create = createWebServer;
