(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
  VERSION: '%KARMA_VERSION%',
  KARMA_URL_ROOT: '%KARMA_URL_ROOT%',
  CONTEXT_URL: 'context.html'
};

},{}],2:[function(require,module,exports){
var stringify = require('./stringify');
var constant = require('./constants');
var util = require('./util');


/* jshint unused: false */
var Karma = function(socket, iframe, opener, navigator, location) {
  var hasError = false;
  var startEmitted = false;
  var reloadingContext = false;
  var store = {};
  var self = this;
  var queryParams = util.parseQueryParams(location.search);
  var browserId = queryParams.id || util.generateId('manual-');
  var returnUrl = queryParams['return_url' + ''] || null;
  var currentTransport;

  var resultsBufferLimit = 1;
  var resultsBuffer = [];

  this.VERSION = constant.VERSION;
  this.config = {};

  var childWindow = null;
  var navigateContextTo = function(url) {
    if (self.config.useIframe === false) {
      if (childWindow === null || childWindow.closed === true) {
        // If this is the first time we are opening the window, or the window is closed
        childWindow = opener('about:blank');
      }
      childWindow.location = url;
    } else {
      iframe.src = url;
    }
  };

  this.setupContext = function(contextWindow) {
    if (hasError) {
      return;
    }

    var getConsole = function(currentWindow) {
      return currentWindow.console || {
          log: function() {},
          info: function() {},
          warn: function() {},
          error: function() {},
          debug: function() {}
        };
    };

    contextWindow.__karma__ = this;

    // This causes memory leak in Chrome (17.0.963.66)
    contextWindow.onerror = function() {
      return contextWindow.__karma__.error.apply(contextWindow.__karma__, arguments);
    };

    contextWindow.onbeforeunload = function(e, b) {
      if (!reloadingContext) {
        // TODO(vojta): show what test (with explanation about jasmine.UPDATE_INTERVAL)
        contextWindow.__karma__.error('Some of your tests did a full page reload!');
      }
    };

    if (self.config.captureConsole) {
      // patch the console
      var localConsole = contextWindow.console = getConsole(contextWindow);
      var browserConsoleLog = localConsole.log;
      var logMethods = ['log', 'info', 'warn', 'error', 'debug'];
      var patchConsoleMethod = function(method) {
        var orig = localConsole[method];
        if (!orig) {
          return;
        }
        localConsole[method] = function() {
          self.log(method, arguments);
          return Function.prototype.apply.call(orig, localConsole, arguments);
        };
      };
      for (var i = 0; i < logMethods.length; i++) {
        patchConsoleMethod(logMethods[i]);
      }
    }

    contextWindow.dump = function() {
      self.log('dump', arguments);
    };

    contextWindow.alert = function(msg) {
      self.log('alert', [msg]);
    };
  };

  this.log = function(type, args) {
    var values = [];

    for (var i = 0; i < args.length; i++) {
      values.push(this.stringify(args[i], 3));
    }

    this.info({log: values.join(', '), type: type});
  };

  this.stringify = stringify;


  var clearContext = function() {
    reloadingContext = true;
    navigateContextTo('about:blank');
  };

  // error during js file loading (most likely syntax error)
  // we are not going to execute at all
  this.error = function(msg, url, line) {
    hasError = true;
    socket.emit('error', url ? msg + '\nat ' + url + (line ? ':' + line : '') : msg);
    this.complete();
    return false;
  };

  this.result = function(result) {
    if (!startEmitted) {
      socket.emit('start', {total: null});
      startEmitted = true;
    }

    if (resultsBufferLimit === 1) {
      return socket.emit('result', result);
    }

    resultsBuffer.push(result);

    if (resultsBuffer.length === resultsBufferLimit) {
      socket.emit('result', resultsBuffer);
      resultsBuffer = [];
    }
  };

  this.complete = function(result) {
    if (resultsBuffer.length) {
      socket.emit('result', resultsBuffer);
      resultsBuffer = [];
    }

    // give the browser some time to breath, there could be a page reload, but because a bunch of
    // tests could run in the same event loop, we wouldn't notice.
    setTimeout(function() {
      clearContext();
    }, 0);

    socket.emit('complete', result || {}, function() {
      if (returnUrl) {
        location.href = returnUrl;
      }
    });
  };

  this.info = function(info) {
    // TODO(vojta): introduce special API for this
    if (!startEmitted && util.isDefined(info.total)) {
      socket.emit('start', info);
      startEmitted = true;
    } else {
      socket.emit('info', info);
    }
  };

  var UNIMPLEMENTED_START = function() {
    this.error('You need to include some adapter that implements __karma__.start method!');
  };

  // all files loaded, let's start the execution
  this.loaded = function() {
    // has error -> cancel
    if (!hasError) {
      this.start(this.config);
    }

    // remove reference to child iframe
    this.start = UNIMPLEMENTED_START;
  };

  this.store = function(key, value) {
    if (util.isUndefined(value)) {
      return store[key];
    }

    if (util.instanceOf(value, 'Array')) {
      var s = store[key] = [];
      for (var i = 0; i < value.length; i++) {
        s.push(value[i]);
      }
    } else {
      // TODO(vojta): clone objects + deep
      store[key] = value;
    }
  };

  // supposed to be overriden by the context
  // TODO(vojta): support multiple callbacks (queue)
  this.start = UNIMPLEMENTED_START;

  socket.on('execute', function(cfg) {
    // reset hasError and reload the iframe
    hasError = false;
    startEmitted = false;
    reloadingContext = false;
    self.config = cfg;
    navigateContextTo(constant.CONTEXT_URL);

    // clear the console before run
    // works only on FF (Safari, Chrome do not allow to clear console from js source)
    if (window.console && window.console.clear) {
      window.console.clear();
    }
  });

  // report browser name, id
  socket.on('connect', function() {
    currentTransport = socket.socket.transport.name;

    // TODO(vojta): make resultsBufferLimit configurable
    if (currentTransport === 'websocket' || currentTransport === 'flashsocket') {
      resultsBufferLimit = 1;
    } else {
      resultsBufferLimit = 50;
    }

    socket.emit('register', {
      name: navigator.userAgent,
      id: browserId
    });
  });
};

module.exports = Karma;

},{"./constants":1,"./stringify":4,"./util":6}],3:[function(require,module,exports){
var Karma = require('./karma');
var StatusUpdater = require('./updater');
var util = require('./util');

var KARMA_URL_ROOT = require('./constants').KARMA_URL_ROOT;


// connect socket.io
// https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
var socket = io.connect('http://' + location.host, {
  'reconnection delay': 500,
  'reconnection limit': 2000,
  'resource': KARMA_URL_ROOT.substr(1) + 'socket.io',
  'sync disconnect on unload': true,
  'max reconnection attempts': Infinity
});

// instantiate the updater of the view
new StatusUpdater(socket, util.elm('title'), util.elm('banner'), util.elm('browsers'));
window.karma = new Karma(socket, util.elm('context'), window.open,
	window.navigator, window.location);

},{"./constants":1,"./karma":2,"./updater":5,"./util":6}],4:[function(require,module,exports){
var instanceOf = require('./util').instanceOf;

var stringify = function stringify(obj, depth) {

  if (depth === 0) {
    return '...';
  }

  if (obj === null) {
    return 'null';
  }

  switch (typeof obj) {
  case 'string':
    return '\'' + obj + '\'';
  case 'undefined':
    return 'undefined';
  case 'function':
    return obj.toString().replace(/\{[\s\S]*\}/, '{ ... }');
  case 'boolean':
    return obj ? 'true' : 'false';
  case 'object':
    var strs = [];
    if (instanceOf(obj, 'Array')) {
      strs.push('[');
      for (var i = 0, ii = obj.length; i < ii; i++) {
        if (i) {
          strs.push(', ');
        }
        strs.push(stringify(obj[i], depth - 1));
      }
      strs.push(']');
    } else if (instanceOf(obj, 'Date')) {
      return obj.toString();
    } else if (instanceOf(obj, 'Text')) {
      return obj.nodeValue;
    } else if (instanceOf(obj, 'Comment')) {
      return '<!--' + obj.nodeValue + '-->';
    } else if (obj.outerHTML) {
      return obj.outerHTML;
    } else {
      var constructor = 'Object';
      if (obj.constructor && typeof obj.constructor === 'function') {
        constructor = obj.constructor.name;
      }

      strs.push(constructor);
      strs.push('{');
      var first = true;
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (first) {
            first = false;
          } else {
            strs.push(', ');
          }

          strs.push(key + ': ' + stringify(obj[key], depth - 1));
        }
      }
      strs.push('}');
    }
    return strs.join('');
  default:
    return obj;
  }
};


module.exports = stringify;

},{"./util":6}],5:[function(require,module,exports){
var VERSION = require('./constants').VERSION;


var StatusUpdater = function(socket, titleElement, bannerElement, browsersElement) {
  var updateBrowsersInfo = function(browsers) {
    var items = [], status;
    for (var i = 0; i < browsers.length; i++) {
      status = browsers[i].isReady ? 'idle' : 'executing';
      items.push('<li class="' + status + '">' + browsers[i].name + ' is ' + status + '</li>');
    }
    browsersElement.innerHTML = items.join('\n');
  };

  var updateBanner = function(status) {
    return function(param) {
      var paramStatus = param ? status.replace('$', param) : status;
      titleElement.innerHTML = 'Karma v' + VERSION + ' - ' + paramStatus;
      bannerElement.className = status === 'connected' ? 'online' : 'offline';
    };
  };

  socket.on('connect', updateBanner('connected'));
  socket.on('disconnect', updateBanner('disconnected'));
  socket.on('reconnecting', updateBanner('reconnecting in $ ms...'));
  socket.on('reconnect', updateBanner('connected'));
  socket.on('reconnect_failed', updateBanner('failed to reconnect'));
  socket.on('info', updateBrowsersInfo);
  socket.on('disconnect', function() {
    updateBrowsersInfo([]);
  });
};

module.exports = StatusUpdater;

},{"./constants":1}],6:[function(require,module,exports){
exports.instanceOf = function(value, constructorName) {
  return Object.prototype.toString.apply(value) === '[object ' + constructorName + ']';
};

exports.elm = function(id) {
  return document.getElementById(id);
};

exports.generateId = function(prefix) {
  return prefix + Math.floor(Math.random() * 10000);
};

exports.isUndefined = function(value) {
  return typeof value === 'undefined';
};

exports.isDefined = function(value) {
  return !exports.isUndefined(value);
};

exports.parseQueryParams = function(locationSearch) {
  var params = {};
  var pairs = locationSearch.substr(1).split('&');
  var keyValue;

  for (var i = 0; i < pairs.length; i++) {
    keyValue = pairs[i].split('=');
    params[decodeURIComponent(keyValue[0])] = decodeURIComponent(keyValue[1]);
  }

  return params;
};

},{}]},{},[3]);