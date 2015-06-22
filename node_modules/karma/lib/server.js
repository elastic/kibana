var io = require('socket.io');
var di = require('di');

var cfg = require('./config');
var logger = require('./logger');
var constant = require('./constants');
var watcher = require('./watcher');
var plugin = require('./plugin');

var ws = require('./web-server');
var preprocessor = require('./preprocessor');
var Launcher = require('./launcher').Launcher;
var FileList = require('./file_list').List;
var reporter = require('./reporter');
var helper = require('./helper');
var events = require('./events');
var EventEmitter = events.EventEmitter;
var Executor = require('./executor');
var Browser = require('./browser');
var BrowserCollection = require('./browser_collection');
var EmitterWrapper = require('./emitter_wrapper');
var processWrapper = new EmitterWrapper(process);

var log = logger.create();


var start = function(injector, config, launcher, globalEmitter, preprocess, fileList, webServer,
    capturedBrowsers, socketServer, executor, done) {

  config.frameworks.forEach(function(framework) {
    injector.get('framework:' + framework);
  });

  var filesPromise = fileList.refresh();

  if (config.autoWatch) {
    filesPromise.then(function() {
      injector.invoke(watcher.watch);
    }, function() {
      injector.invoke(watcher.watch);
    });
  }

  webServer.on('error', function(e) {
    if (e.code === 'EADDRINUSE') {
      log.warn('Port %d in use', config.port);
      config.port++;
      webServer.listen(config.port);
    } else {
      throw e;
    }
  });

  // A map of launched browsers.
  var singleRunDoneBrowsers = Object.create(null);

  // Passing fake event emitter, so that it does not emit on the global,
  // we don't care about these changes.
  var singleRunBrowsers = new BrowserCollection(new EventEmitter());

  // Some browsers did not get captured.
  var singleRunBrowserNotCaptured = false;

  webServer.listen(config.port, function() {
    log.info('Karma v%s server started at http://%s:%s%s', constant.VERSION, config.hostname,
        config.port, config.urlRoot);

    if (config.browsers && config.browsers.length) {
      injector.invoke(launcher.launch, launcher).forEach(function(browserLauncher) {
        singleRunDoneBrowsers[browserLauncher.id] = false;
      });
    }
  });

  globalEmitter.on('browsers_change', function() {
    // TODO(vojta): send only to interested browsers
    socketServer.sockets.emit('info', capturedBrowsers.serialize());
  });

  globalEmitter.on('browser_register', function(browser) {
    launcher.markCaptured(browser.id);

    // TODO(vojta): This is lame, browser can get captured and then crash (before other browsers get
    // captured).
    if (config.autoWatch && launcher.areAllCaptured()) {
      executor.schedule();
    }
  });

  var EVENTS_TO_REPLY = ['start', 'info', 'error', 'result', 'complete'];
  socketServer.sockets.on('connection', function(socket) {
    log.debug('A browser has connected on socket ' + socket.id);

    var replySocketEvents = events.bufferEvents(socket, EVENTS_TO_REPLY);

    socket.on('complete', function(data, ack) {
      ack();
    });

    socket.on('register', function(info) {
      var newBrowser;
      var isRestart;

      if (info.id) {
        newBrowser = capturedBrowsers.getById(info.id) || singleRunBrowsers.getById(info.id);
      }

      if (newBrowser) {
        isRestart = newBrowser.state === Browser.STATE_DISCONNECTED;
        newBrowser.reconnect(socket);

        // We are restarting a previously disconnected browser.
        if (isRestart && config.singleRun) {
          newBrowser.execute(config.client);
        }
      } else {
        newBrowser = injector.createChild([{
          id: ['value', info.id || null],
          fullName: ['value', info.name],
          socket: ['value', socket]
        }]).instantiate(Browser);

        newBrowser.init();

        // execute in this browser immediately
        if (config.singleRun) {
          newBrowser.execute(config.client);
          singleRunBrowsers.add(newBrowser);
        }
      }

      replySocketEvents();
    });
  });

  var emitRunCompleteIfAllBrowsersDone = function() {
    // all browsers done
    var isDone = Object.keys(singleRunDoneBrowsers).reduce(function(isDone, id) {
      return isDone && singleRunDoneBrowsers[id];
    }, true);

    if (isDone) {
      var results = singleRunBrowsers.getResults();
      if (singleRunBrowserNotCaptured) {
        results.exitCode = 1;
      }

      globalEmitter.emit('run_complete', singleRunBrowsers, results);
    }
  };

  if (config.singleRun) {
    globalEmitter.on('browser_complete', function(completedBrowser) {
      if (completedBrowser.lastResult.disconnected &&
          completedBrowser.disconnectsCount <= config.browserDisconnectTolerance) {
        log.info('Restarting %s (%d of %d attempts)', completedBrowser.name,
            completedBrowser.disconnectsCount, config.browserDisconnectTolerance);
        if (!launcher.restart(completedBrowser.id)) {
          singleRunDoneBrowsers[completedBrowser.id] = true;
          emitRunCompleteIfAllBrowsersDone();
        }
      } else {
        singleRunDoneBrowsers[completedBrowser.id] = true;

        if (launcher.kill(completedBrowser.id)) {
          // workaround to supress "disconnect" warning
          completedBrowser.state = Browser.STATE_DISCONNECTED;
        }

        emitRunCompleteIfAllBrowsersDone();
      }
    });

    globalEmitter.on('browser_process_failure', function(browserLauncher) {
      singleRunDoneBrowsers[browserLauncher.id] = true;
      singleRunBrowserNotCaptured = true;

      emitRunCompleteIfAllBrowsersDone();
    });

    globalEmitter.on('run_complete', function(browsers, results) {
      log.debug('Run complete, exiting.');
      disconnectBrowsers(results.exitCode);
    });

    globalEmitter.emit('run_start', singleRunBrowsers);
  }


  if (config.autoWatch) {
    globalEmitter.on('file_list_modified', function() {
      log.debug('List of files has changed, trying to execute');
      executor.schedule();
    });
  }

  var webServerCloseTimeout = 3000;
  var disconnectBrowsers = function(code) {
    // Slightly hacky way of removing disconnect listeners
    // to suppress "browser disconnect" warnings
    // TODO(vojta): change the client to not send the event (if disconnected by purpose)
    var sockets = socketServer.sockets.sockets;
    Object.getOwnPropertyNames(sockets).forEach(function(key) {
      var socket = sockets[key];
      socket.removeAllListeners('disconnect');
      if (!socket.disconnected) {
        socket.disconnect();
      }
    });

    var removeAllListenersDone = false;
    var removeAllListeners = function() {
      // make sure we don't execute cleanup twice
      if (removeAllListenersDone) {
        return;
      }
      removeAllListenersDone = true;
      webServer.removeAllListeners();
      processWrapper.removeAllListeners();
      done(code || 0);
    };

    globalEmitter.emitAsync('exit').then(function() {
      // don't wait forever on webServer.close() because
      // pending client connections prevent it from closing.
      var closeTimeout = setTimeout(removeAllListeners, webServerCloseTimeout);

      // shutdown the server...
      webServer.close(function() {
        clearTimeout(closeTimeout);
        removeAllListeners();
      });

      // shutdown socket.io flash transport, if defined
      if (socketServer.flashPolicyServer) {
        socketServer.flashPolicyServer.close();
      }
    });
  };

  try {
    processWrapper.on('SIGINT', disconnectBrowsers);
    processWrapper.on('SIGTERM', disconnectBrowsers);
  } catch (e) {
    // Windows doesn't support signals yet, so they simply don't get this handling.
    // https://github.com/joyent/node/issues/1553
  }

  // Handle all unhandled exceptions, so we don't just exit but
  // disconnect the browsers before exiting.
  processWrapper.on('uncaughtException', function(error) {
    log.error(error);
    disconnectBrowsers(1);
  });
};
start.$inject = ['injector', 'config', 'launcher', 'emitter', 'preprocess', 'fileList',
    'webServer', 'capturedBrowsers', 'socketServer', 'executor', 'done'];


var createSocketIoServer = function(webServer, executor, config) {
  var server = io.listen(webServer, {
    // avoid destroying http upgrades from socket.io to get proxied websockets working
    'destroy upgrade': false,
    // socket.io has a timeout (15s by default) before destroying a store (a data structure where
    // data associated with a socket are stored). Unfortunately this timeout is not cleared
    // properly on socket.io shutdown and this timeout prevents karma from exiting cleanly.
    // We change this timeout to 0 to make Karma exit just after all tests were executed.
    'client store expiration': 0,
    logger: logger.create('socket.io', constant.LOG_ERROR),
    resource: config.urlRoot + 'socket.io',
    transports: config.transports
  });

  // hack to overcome circular dependency
  executor.socketIoSockets = server.sockets;

  return server;
};


exports.start = function(cliOptions, done) {
  // apply the default logger config (and config from CLI) as soon as we can
  logger.setup(cliOptions.logLevel || constant.LOG_INFO,
      helper.isDefined(cliOptions.colors) ? cliOptions.colors : true, [constant.CONSOLE_APPENDER]);

  var config = cfg.parseConfig(cliOptions.configFile, cliOptions);
  var modules = [{
    helper: ['value', helper],
    logger: ['value', logger],
    done: ['value', done || process.exit],
    emitter: ['type', EventEmitter],
    launcher: ['type', Launcher],
    config: ['value', config],
    preprocess: ['factory', preprocessor.createPreprocessor],
    fileList: ['type', FileList],
    webServer: ['factory', ws.create],
    socketServer: ['factory', createSocketIoServer],
    executor: ['type', Executor],
    // TODO(vojta): remove
    customFileHandlers: ['value', []],
    // TODO(vojta): remove, once karma-dart does not rely on it
    customScriptTypes: ['value', []],
    reporter: ['factory', reporter.createReporters],
    capturedBrowsers: ['type', BrowserCollection],
    args: ['value', {}],
    timer: ['value', {setTimeout: setTimeout, clearTimeout: clearTimeout}]
  }];

  // load the plugins
  modules = modules.concat(plugin.resolve(config.plugins));

  var injector = new di.Injector(modules);

  injector.invoke(start);
};
