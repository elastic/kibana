/* jshint strict:false */
/**
 * @module nock/scope
 */
var fs              = require('fs')
  , globalIntercept = require('./intercept')
  , mixin           = require('./mixin')
  , matchBody       = require('./match_body')
  , common          = require('./common')
  , assert          = require('assert')
  , url             = require('url')
  , _               = require('lodash')
  , debug           = require('debug')('nock.scope');

function isStream(obj) {
  return (typeof obj !== 'undefined') &&
         (typeof a !== 'string') &&
         (! Buffer.isBuffer(obj)) &&
         _.isFunction(obj.setEncoding);
}

function startScope(basePath, options) {
  var interceptors = {},
      scope,
      transformPathFunction,
      transformRequestBodyFunction,
      matchHeaders = [],
      logger = debug,
      scopeOptions = options || {},
      urlParts = url.parse(basePath),
      port = urlParts.port || ((urlParts.protocol === 'http:') ? 80 : 443),
      persist = false,
      contentLen = false,
      date = null,
      basePathname = urlParts.pathname.replace(/\/$/, '');

  basePath = urlParts.protocol + '//' + urlParts.hostname + ':' + port;

  function add(key, interceptor, scope) {
    if (! interceptors.hasOwnProperty(key)) {
      interceptors[key] = [];
    }
    interceptors[key].push(interceptor);
    globalIntercept(basePath, interceptor, scope, scopeOptions, urlParts.hostname);
  }

  function remove(key, interceptor) {
    if (persist) {
      return;
    }
    var arr = interceptors[key];
    if (arr) {
      arr.splice(arr.indexOf(interceptor), 1);
      if (arr.length === 0) { delete interceptors[key]; }
    }
  }

  function intercept(uri, method, requestBody, interceptorOptions) {
    var interceptorMatchHeaders = [];
    var key = method.toUpperCase() + ' ' + basePath + basePathname + uri;

    function replyWithError(errorMessage) {
      this.errorMessage = errorMessage;

      this.options = interceptorOptions || {};
      for (var opt in scopeOptions) {
        if (_.isUndefined(this.options[opt])) {
          this.options[opt] = scopeOptions[opt];
        }
      }

      add(key, this, scope, scopeOptions);
      return scope;
    }

    function reply(statusCode, body, headers) {
      if (arguments.length <= 2 && _.isFunction(statusCode)) {
        body = statusCode;
        statusCode = 200;
      }

      this.statusCode = statusCode;

      //  We use lower-case headers throughout Nock.
      headers = common.headersFieldNamesToLowerCase(headers);

      this.options = interceptorOptions || {};
      for (var opt in scopeOptions) {
        if (_.isUndefined(this.options[opt])) {
          this.options[opt] = scopeOptions[opt];
        }
      }

      if (scope._defaultReplyHeaders) {
        headers = headers || {};
        headers = mixin(scope._defaultReplyHeaders, headers);
      }

      if (date) {
        headers = headers || {};
        headers['date'] = date.toUTCString();
      }

      if (headers !== undefined) {
        this.headers = {};
        this.rawHeaders = [];

        // makes sure all keys in headers are in lower case
        for (var key2 in headers) {
          if (headers.hasOwnProperty(key2)) {
            this.headers[key2.toLowerCase()] = headers[key2];
            this.rawHeaders.push(key2);
            this.rawHeaders.push(headers[key2]);
          }
        }
        debug('reply.rawHeaders:', this.rawHeaders);
      }

      //  If the content is not encoded we may need to transform the response body.
      //  Otherwise we leave it as it is.
      if (!common.isContentEncoded(headers)) {
        if (body && typeof(body) !== 'string' &&
            typeof(body) !== 'function' &&
            !Buffer.isBuffer(body) &&
            !isStream(body)) {
          try {
            body = JSON.stringify(body);
            if (!this.headers) {
              this.headers = {};
            }
            if (!this.headers['content-type']) {
              this.headers['content-type'] = 'application/json';
            }
            if (contentLen) {
              this.headers['content-length'] = body.length;
            }
          } catch(err) {
            throw new Error('Error encoding response body into JSON');
          }
        }
      }

      this.body = body;

      add(key, this, scope, scopeOptions);
      return scope;
    }

    function replyWithFile(statusCode, filePath, headers) {
      var readStream = fs.createReadStream(filePath);
      readStream.pause();
      this.filePath = filePath;
      return reply.call(this, statusCode, readStream, headers);
    }

    var matchStringOrRegexp = function(target, pattern) {
      if (pattern instanceof RegExp) {
        return target.toString().match(pattern);
      } else {
        return target === pattern;
      }
    };

    function match(options, body, hostNameOnly) {
      if (hostNameOnly) {
        return options.hostname === urlParts.hostname;
      }

      var method = options.method || 'GET'
        , path = options.path
        , matches
        , proto = options.proto;

      if (transformPathFunction) {
        path = transformPathFunction(path);
      }
      if (typeof(body) !== 'string') {
        body = body.toString();
      }
      if (transformRequestBodyFunction) {
        body = transformRequestBodyFunction(body, this._requestBody);
      }

      var checkHeaders = function(header) {
        if (_.isFunction(header.value)) {
          return header.value(options.getHeader(header.name));
        }
        return matchStringOrRegexp(options.getHeader(header.name), header.value);
      };

      if (!matchHeaders.every(checkHeaders) ||
          !interceptorMatchHeaders.every(checkHeaders)) {
        logger('headers don\'t match');
        return false;
      }

      // Also match request headers
      // https://github.com/pgte/nock/issues/163
      function reqheaderMatches(key) {
        //  We don't try to match request headers if these weren't even specified in the request.
        if (! options.headers) {
          return true;
        }

        //  We skip 'host' header comparison unless it's available in both mock and actual request.
        //  This because 'host' may get inserted by Nock itself and then get recorder.
        //  NOTE: We use lower-case header field names throughout Nock.
        if (key === 'host' &&
          (_.isUndefined(options.headers[key]) ||
           _.isUndefined(this.reqheaders[key])))
        {
          return true;
        }

        if (options.headers[key] === this.reqheaders[key]) {
          return true;
        }

        debug('request header field doesn\'t match:', key, options.headers[key], this.reqheaders[key]);
        return false;
      }

      var reqHeadersMatch =
        ! this.reqheaders ||
        Object.keys(this.reqheaders).every(reqheaderMatches.bind(this));

      if (!reqHeadersMatch) {
        return false;
      }

      function reqheaderContains(header) {
        return _.has(options.headers, header);
      }

      var reqContainsBadHeaders =
        this.badheaders &&
        _.some(this.badheaders, reqheaderContains);

      if (reqContainsBadHeaders) {
        return false;
      }

      var matchKey = method.toUpperCase() + ' ';

      //  If we have a filtered scope then we use it instead reconstructing
      //  the scope from the request options (proto, host and port) as these
      //  two won't necessarily match and we have to remove the scope that was
      //  matched (vs. that was defined).
      if (this.__nock_filteredScope) {
        matchKey += this.__nock_filteredScope;
      } else {
        matchKey += proto + '://' + options.host;
        if (
             options.port && options.host.indexOf(':') < 0 &&
             (options.port !== 80 || options.proto !== 'http') &&
             (options.port !== 443 || options.proto !== 'https')
           ) {
          matchKey += ":" + options.port;
        }
      }
      matchKey += path;

      // Match query strings when using query()
      var matchQueries = true;
      var queryIndex = -1;
      var queries;
      if (this.queries && (queryIndex = matchKey.indexOf('?')) !== -1) {
        queries = matchKey.slice(queryIndex + 1).split('&');

        // Only check for query string matches if this.queries is an object
        if (_.isObject(this.queries)) {
          for (var i = 0; i < queries.length; i++) {
            var query = queries[i].split('=');

            if (query[1] === undefined || this.queries[ query[0] ] === undefined) {
              matchQueries = false;
              break;
            }

            var isMatch = matchStringOrRegexp(query[1], this.queries[ query[0] ]);
            matchQueries = matchQueries && !!isMatch;
          }
        }

        // Remove the query string from the matchKey
        matchKey = matchKey.substr(0, queryIndex);
      } else if (this.queries) {
        // If we expected query strings but didn't get any then this isn't a match
        matchQueries = false;
      }

      matches = matchKey === this._key && matchQueries;

      // special logger for query()
      if (queryIndex !== -1) {
        logger('matching ' + matchKey + '?' + queries.join('&') + ' to ' + this._key +
               ' with query(' + JSON.stringify(this.queries) + '): ' + matches);
      } else {
        logger('matching ' + matchKey + ' to ' + this._key + ': ' + matches);
      }

      if (matches) {
        matches = (matchBody.call(options, this._requestBody, body));
        if (!matches) {
          logger('bodies don\'t match: \n', this._requestBody, '\n', body);
        }
      }

      return matches;
    }

    function matchIndependentOfBody(options) {
      var method = options.method || 'GET'
        , path = options.path
        , proto = options.proto;

      if (transformPathFunction) {
        path = transformPathFunction(path);
      }

      var checkHeaders = function(header) {
        return options.getHeader && matchStringOrRegexp(options.getHeader(header.name), header.value);
      };

      if (!matchHeaders.every(checkHeaders) ||
          !interceptorMatchHeaders.every(checkHeaders)) {
        return false;
      }

      var matchKey = method + ' ' + proto + '://' + options.host + path;
      return this._key === matchKey;
    }

    function filteringPath() {
      if (_.isFunction(arguments[0])) {
        this.transformFunction = arguments[0];
      }
      return this;
    }

    function discard() {
      if ((persist || this.counter > 0) && this.filePath) {
        this.body = fs.createReadStream(this.filePath);
        this.body.pause();
      }

      if (!persist && this.counter < 1) {
        remove(this._key, this);
      }
    }

    function matchHeader(name, value) {
      interceptorMatchHeaders.push({ name: name, value: value });
      return this;
    }

    function basicAuth(options) {
      var username = options['user'];
      var password = options['pass'];
      var name = 'authorization';
      var value = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
      interceptorMatchHeaders.push({ name: name, value: value });
      return this;
    }

    /**
     * Set query strings for the interceptor
     * @name query
     * @param Object Object of query string name,values (accepts regexp values)
     * @public
     * @example
     * // Will match 'http://zombo.com/?q=t'
     * nock('http://zombo.com').get('/').query({q: 't'});
     */
    function query(queries) {
      this.queries = this.queries || {};

      // Allow all query strings to match this route
      if (queries === true) {
        this.queries = queries;
      }

      for (var q in queries) {
        if (_.isUndefined(this.queries[q])) {
          var value = queries[q];

          switch (true) {
          case _.isNumber(value): // fall-though
          case _.isBoolean(value):
            value = value.toString();
            break;
          case _.isUndefined(value): // fall-though
          case _.isNull(value):
            value = '';
            break;
          case _.isString(value):
            value = encodeURIComponent(value);
            break;
          }

          q = encodeURIComponent(q);

          // everything else, incl. Strings and RegExp values are used 'as-is'
          this.queries[q] = value;
        }
      }

      return this;
    }

    /**
     * Set number of times will repeat the interceptor
     * @name times
     * @param Integer Number of times to repeat (should be > 0)
     * @public
     * @example
     * // Will repeat mock 5 times for same king of request
     * nock('http://zombo.com).get('/').times(5).reply(200, 'Ok');
    */
    function times(newCounter) {
      if (newCounter < 1) {
        return this;
      }

      this.counter = newCounter;

      return this;
    }

    /**
     * An sugar syntax for times(1)
     * @name once
     * @see {@link times}
     * @public
     * @example
     * nock('http://zombo.com).get('/').once.reply(200, 'Ok');
    */
    function once() {
      return this.times(1);
    }

    /**
     * An sugar syntax for times(2)
     * @name twice
     * @see {@link times}
     * @public
     * @example
     * nock('http://zombo.com).get('/').twice.reply(200, 'Ok');
    */
    function twice() {
      return this.times(2);
    }

    /**
     * An sugar syntax for times(3).
     * @name thrice
     * @see {@link times}
     * @public
     * @example
     * nock('http://zombo.com).get('/').thrice.reply(200, 'Ok');
    */
    function thrice() {
      return this.times(3);
    }

    /**
     * Delay the response by a certain number of ms.
     *
     * @param  {integer} ms - Number of milliseconds to wait
     * @return {scope} - the current scope for chaining
     */
    function delay(ms) {
      this.delayInMs = ms;
      return this;
    }

    /**
     * Delay the connection by a certain number of ms.
     *
     * @param  {integer} ms - Number of milliseconds to wait
     * @return {scope} - the current scope for chaining
     */
    function delayConnection(ms) {
      this.delayConnectionInMs = ms;
      return this;
    }

    /**
     * Make the socket idle for a certain number of ms (simulated).
     *
     * @param  {integer} ms - Number of milliseconds to wait
     * @return {scope} - the current scope for chaining
     */
    function socketDelay(ms) {
      this.socketDelayInMs = ms;
      return this;
    }

    var interceptor = {
        _key: key
      , counter: 1
      , _requestBody: requestBody
      //  We use lower-case header field names throughout Nock.
      , reqheaders: common.headersFieldNamesToLowerCase((options && options.reqheaders) || {})
      , badheaders: common.headersFieldsArrayToLowerCase((options && options.badheaders) || [])
      , reply: reply
      , replyWithError: replyWithError
      , replyWithFile: replyWithFile
      , discard: discard
      , match: match
      , matchIndependentOfBody: matchIndependentOfBody
      , filteringPath: filteringPath
      , matchHeader: matchHeader
      , basicAuth: basicAuth
      , query: query
      , times: times
      , once: once
      , twice: twice
      , thrice: thrice
      , delay: delay
      , delayConnection: delayConnection
      , socketDelay: socketDelay
    };

    return interceptor;
  }

  function get(uri, requestBody, options) {
    return intercept(uri, 'GET', requestBody, options);
  }

  function post(uri, requestBody, options) {
    return intercept(uri, 'POST', requestBody, options);
  }

  function put(uri, requestBody, options) {
    return intercept(uri, 'PUT', requestBody, options);
  }

  function head(uri, requestBody, options) {
    return intercept(uri, 'HEAD', requestBody, options);
  }

  function patch(uri, requestBody, options) {
    return intercept(uri, 'PATCH', requestBody, options);
  }

  function merge(uri, requestBody, options) {
    return intercept(uri, 'MERGE', requestBody, options);
  }

  function _delete(uri, requestBody, options) {
    return intercept(uri, 'DELETE', requestBody, options);
  }

  function pendingMocks() {
    return Object.keys(interceptors);
  }

  function isDone() {

    // if nock is turned off, it always says it's done
    if (! globalIntercept.isOn()) { return true; }

    var keys = Object.keys(interceptors);
    if (keys.length === 0) {
      return true;
    } else {
      var doneHostCount = 0;

      keys.forEach(function(key) {
        var doneInterceptorCount = 0;

        interceptors[key].forEach(function(interceptor) {
          var isRequireDoneDefined = !_.isUndefined(interceptor.options.requireDone);
          if (isRequireDoneDefined && interceptor.options.requireDone === false) {
            doneInterceptorCount += 1;
          } else if (persist && interceptor.interceptionCounter > 0) {
            doneInterceptorCount += 1;
          }
        });

        if (doneInterceptorCount === interceptors[key].length ) {
          doneHostCount += 1;
        }
      });
      return (doneHostCount === keys.length);
    }
  }

  function done() {
    assert.ok(isDone(), "Mocks not yet satisfied:\n" + pendingMocks().join("\n"));
  }

  function buildFilter() {
    var filteringArguments = arguments;

    if (arguments[0] instanceof RegExp) {
      return function(candidate) {
        if (candidate) {
          candidate = candidate.replace(filteringArguments[0], filteringArguments[1]);
        }
        return candidate;
      };
    } else if (_.isFunction(arguments[0])) {
      return arguments[0];
    }
  }

  function filteringPath() {
    transformPathFunction = buildFilter.apply(undefined, arguments);
    if (!transformPathFunction) {
      throw new Error('Invalid arguments: filtering path should be a function or a regular expression');
    }
    return this;
  }

  function filteringRequestBody() {
    transformRequestBodyFunction = buildFilter.apply(undefined, arguments);
    if (!transformRequestBodyFunction) {
      throw new Error('Invalid arguments: filtering request body should be a function or a regular expression');
    }
    return this;
  }

  function matchHeader(name, value) {
    //  We use lower-case header field names throughout Nock.
    matchHeaders.push({ name: name.toLowerCase(), value: value });
    return this;
  }

  function defaultReplyHeaders(headers) {
    this._defaultReplyHeaders = common.headersFieldNamesToLowerCase(headers);
    return this;
  }

  function log(newLogger) {
    logger = newLogger;
    return this;
  }

  function _persist() {
    persist = true;
    return this;
  }

  function shouldPersist() {
    return persist;
  }

  function replyContentLength() {
    contentLen = true;
    return this;
  }

  function replyDate(d) {
    date = d || new Date();
    return this;
  }


  scope = {
      get: get
    , post: post
    , delete: _delete
    , put: put
    , merge: merge
    , patch: patch
    , head: head
    , intercept: intercept
    , done: done
    , isDone: isDone
    , filteringPath: filteringPath
    , filteringRequestBody: filteringRequestBody
    , matchHeader: matchHeader
    , defaultReplyHeaders: defaultReplyHeaders
    , log: log
    , persist: _persist
    , shouldPersist: shouldPersist
    , pendingMocks: pendingMocks
    , replyContentLength: replyContentLength
    , replyDate: replyDate
  };

  return scope;
}

function cleanAll() {
  globalIntercept.removeAll();
  return module.exports;
}

function loadDefs(path) {
  var contents = fs.readFileSync(path);
  return JSON.parse(contents);
}

function load(path) {
  return define(loadDefs(path));
}

function getStatusFromDefinition(nockDef) {
  //  Backward compatibility for when `status` was encoded as string in `reply`.
  if (!_.isUndefined(nockDef.reply)) {
    //  Try parsing `reply` property.
    var parsedReply = parseInt(nockDef.reply, 10);
    if (_.isNumber(parsedReply)) {
      return parsedReply;
    }
  }

  var DEFAULT_STATUS_OK = 200;
  return nockDef.status || DEFAULT_STATUS_OK;
}

function getScopeFromDefinition(nockDef) {

  //  Backward compatibility for when `port` was part of definition.
  if (!_.isUndefined(nockDef.port)) {
    //  Include `port` into scope if it doesn't exist.
    var options = url.parse(nockDef.scope);
    if (_.isNull(options.port)) {
      return nockDef.scope + ':' + nockDef.port;
    } else {
      if (parseInt(options.port) !== parseInt(nockDef.port)) {
        throw new Error('Mismatched port numbers in scope and port properties of nock definition.');
      }
    }
  }

  return nockDef.scope;
}

function tryJsonParse(string) {
  try {
    return JSON.parse(string);
  } catch(err) {
    return string;
  }
}

function define(nockDefs) {

  var nocks     = [];

  nockDefs.forEach(function(nockDef) {

    var nscope     = getScopeFromDefinition(nockDef)
      , npath      = nockDef.path
      , method     = nockDef.method.toLowerCase() || "get"
      , status     = getStatusFromDefinition(nockDef)
      , headers    = nockDef.headers    || {}
      , reqheaders = nockDef.reqheaders || {}
      , body       = nockDef.body       || ''
      , options    = nockDef.options    || {};

    //  We use request headers for both filtering (see below) and mocking.
    //  Here we are setting up mocked request headers but we don't want to
    //  be changing the user's options object so we clone it first.
    options = _.clone(options) || {};
    options.reqheaders = reqheaders;

    //  Response is not always JSON as it could be a string or binary data or
    //  even an array of binary buffers (e.g. when content is enconded)
    var response;
    if (!nockDef.response) {
      response = '';
    } else {
      response = _.isString(nockDef.response) ? tryJsonParse(nockDef.response) : nockDef.response;
    }

    var nock;
    if (body==="*") {
      nock = startScope(nscope, options).filteringRequestBody(function() {
        return "*";
      })[method](npath, "*").reply(status, response, headers);
    } else {
      nock = startScope(nscope, options);
      //  If request headers were specified filter by them.
      if (reqheaders !== {}) {
        for (var k in reqheaders) {
          nock.matchHeader(k, reqheaders[k]);
        }
      }
      if (nockDef.filteringRequestBody) {
        nock.filteringRequestBody(nockDef.filteringRequestBody);
      }
      nock.intercept(npath, method, body).reply(status, response, headers);
    }

    nocks.push(nock);

  });

  return nocks;
}



module.exports = startScope;

module.exports.cleanAll = cleanAll;
module.exports.activate = globalIntercept.activate;
module.exports.isActive = globalIntercept.isActive;
module.exports.removeInterceptor = globalIntercept.removeInterceptor;
module.exports.disableNetConnect = globalIntercept.disableNetConnect;
module.exports.enableNetConnect = globalIntercept.enableNetConnect;
module.exports.load = load;
module.exports.loadDefs = loadDefs;
module.exports.define = define;
