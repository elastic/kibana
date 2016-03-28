'use strict';

/**
 * @module nock/intercepts
 */

var RequestOverrider = require('./request_overrider'),
    common           = require('./common'),
    url              = require('url'),
    inherits         = require('util').inherits,
    http             = require('http'),
    parse            = require('url').parse,
    _                = require('lodash'),
    debug            = require('debug')('nock.intercept'),
    timers           = require('timers');


/**
 * @name NetConnectNotAllowedError
 * @private
 * @desc Error trying to make a connection when disabled external access.
 * @class
 * @example
 * nock.disableNetConnect();
 * http.get('http://zombo.com');
 * // throw NetConnectNotAllowedError
 */
function NetConnectNotAllowedError(host, path) {
  Error.call(this);

  this.name    = 'NetConnectNotAllowedError';
  this.message = 'Nock: Not allow net connect for "' + host + path + '"';

  Error.captureStackTrace(this, this.constructor);
}

inherits(NetConnectNotAllowedError, Error);

var allInterceptors = {},
    allowNetConnect;

/**
 * Enabled real request.
 * @public
 * @param {String|RegExp} matcher=RegExp.new('.*') Expression to match
 * @example
 * // Enables all real requests
 * nock.enableNetConnect();
 * @example
 * // Enables real requests for url that matches google
 * nock.enableNetConnect('google');
 * @example
 * // Enables real requests for url that matches google and amazon
 * nock.enableNetConnect(/(google|amazon)/);
 */
function enableNetConnect(matcher) {
  if (_.isString(matcher)) {
    allowNetConnect = new RegExp(matcher);
  } else if (_.isObject(matcher) && _.isFunction(matcher.test)) {
    allowNetConnect = matcher;
  } else {
    allowNetConnect = /.*/;
  }
}

function isEnabledForNetConnect(options) {
  common.normalizeRequestOptions(options);

  var enabled = allowNetConnect && allowNetConnect.test(options.host);
  debug('Net connect', enabled ? '' : 'not', 'enabled for', options.host);
  return enabled;
}

/**
 * Disable all real requests.
 * @public
 * @param {String|RegExp} matcher=RegExp.new('.*') Expression to match
 * @example
 * nock.disableNetConnect();
*/
function disableNetConnect() {
  allowNetConnect = undefined;
}

function isOn() {
  return !isOff();
}

function isOff() {
  return process.env.NOCK_OFF === 'true';
}

function add(key, interceptor, scope, scopeOptions, host) {
  if (! allInterceptors.hasOwnProperty(key)) {
    allInterceptors[key] = [];
  }
  interceptor.__nock_scope = scope;

  //  We need scope's key and scope options for scope filtering function (if defined)
  interceptor.__nock_scopeKey = key;
  interceptor.__nock_scopeOptions = scopeOptions;
  //  We need scope's host for setting correct request headers for filtered scopes.
  interceptor.__nock_scopeHost = host;
  interceptor.interceptionCounter = 0;

  allInterceptors[key].push(interceptor);
}

function remove(interceptor) {

  if (interceptor.__nock_scope.shouldPersist()) {
    return;
  }

  interceptor.counter -= 1;
  if (interceptor.counter > 0) {
    return;
  }

  var key          = interceptor._key.split(' '),
      u            = url.parse(key[1]),
      hostKey      = u.protocol + '//' + u.host,
      interceptors = allInterceptors[hostKey],
      thisInterceptor;

  if (interceptors) {
    for(var i = 0; i < interceptors.length; i++) {
      thisInterceptor = interceptors[i];
      if (thisInterceptor === interceptor) {
        interceptors.splice(i, 1);
        break;
      }
    }

  }
}

function removeAll() {
  allInterceptors = {};
}

function hasHadInterceptors(options) {
  var basePath,
      isBasePathMatched,
      isScopedMatched;

  common.normalizeRequestOptions(options);

  basePath = options.proto + '://' + options.host;

  debug('looking for interceptors for basepath');

  _.each(allInterceptors, function(interceptor, key) {
    if (key === basePath) {
      isBasePathMatched = true;

      // false to short circuit the .each
      return false;
    }

    _.each(interceptor, function(scope) {
      var filteringScope = scope.__nock_scopeOptions.filteringScope;

      //  If scope filtering function is defined and returns a truthy value
      //  then we have to treat this as a match.
      if (filteringScope && filteringScope(basePath)) {
        debug('found matching scope interceptor');

        //  Keep the filtered scope (its key) to signal the rest of the module
        //  that this wasn't an exact but filtered match.
        scope.__nock_filteredScope = scope.__nock_scopeKey;
        isScopedMatched = true;
        //  Break out of _.each for scopes.
        return false;
      }
    });

    //  Returning falsy value here (which will happen if we have found our matching interceptor)
    //  will break out of _.each for all interceptors.
    return !isScopedMatched;
  });

  return (isScopedMatched || isBasePathMatched);
}

function interceptorsFor(options) {
  var basePath;

  common.normalizeRequestOptions(options);

  basePath = options.proto + '://' + options.host;

  debug('filtering interceptors for basepath', basePath);

  //  First try to use filteringScope if any of the interceptors has it defined.
  var matchingInterceptor;
  _.each(allInterceptors, function(interceptor, key) {
    _.each(interceptor, function(scope) {
      var filteringScope = scope.__nock_scopeOptions.filteringScope;

      //  If scope filtering function is defined and returns a truthy value
      //  then we have to treat this as a match.
      if(filteringScope && filteringScope(basePath)) {
        debug('found matching scope interceptor');

        //  Keep the filtered scope (its key) to signal the rest of the module
        //  that this wasn't an exact but filtered match.
        scope.__nock_filteredScope = scope.__nock_scopeKey;
        matchingInterceptor = interceptor;
        //  Break out of _.each for scopes.
        return false;
      }
    });

    //  Returning falsy value here (which will happen if we have found our matching interceptor)
    //  will break out of _.each for all interceptors.
    return !matchingInterceptor;
  });

  if(matchingInterceptor) {
    return matchingInterceptor;
  }

  return allInterceptors[basePath] || [];
}

function removeInterceptor(options) {
  var baseUrl, key, method, proto;

  proto = options.proto ? options.proto : 'http';

  common.normalizeRequestOptions(options);
  baseUrl = proto + '://' + options.host;

  if (allInterceptors[baseUrl] && allInterceptors[baseUrl].length > 0) {
    if (options.path) {
      method = options.method && options.method.toUpperCase() || 'GET';
      key = method + ' ' + baseUrl + (options.path || '/');

      for (var i = 0; i < allInterceptors[baseUrl].length; i++) {
        if (allInterceptors[baseUrl][i]._key === key) {
          allInterceptors[baseUrl].splice(i, 1);
          break;
        }
      }
    } else {
      allInterceptors[baseUrl].length = 0;
    }

    return true;
  }

  return false;
}
//  Variable where we keep the ClientRequest we have overridden
//  (which might or might not be node's original http.ClientRequest)
var originalClientRequest;

function ErroringClientRequest(error) {
  http.OutgoingMessage.call(this);
  process.nextTick(function() {
    this.emit('error', error);
  }.bind(this));
}

inherits(ErroringClientRequest, http.ClientRequest);

function overrideClientRequest() {
  debug('Overriding ClientRequest');

  if(originalClientRequest) {
    throw new Error('Nock already overrode http.ClientRequest');
  }

  // ----- Extending http.ClientRequest

  //  Define the overriding client request that nock uses internally.
  function OverriddenClientRequest(options, cb) {
    http.OutgoingMessage.call(this);

    if (isOn() && hasHadInterceptors(options)) {

      //  Filter the interceptors per request options.
      var interceptors = interceptorsFor(options);

      debug('using', interceptors.length, 'interceptors');

      //  Use filtered interceptors to intercept requests.
      var overrider = RequestOverrider(this, options, interceptors, remove, cb);
      for(var propName in overrider) {
        if (overrider.hasOwnProperty(propName)) {
          this[propName] = overrider[propName];
        }
      }
    } else {
      debug('falling back to original ClientRequest');

      //  Fallback to original ClientRequest if nock is off or the net connection is enabled.
      if(isOff() || isEnabledForNetConnect(options)) {
        originalClientRequest.apply(this, arguments);
      } else {
        timers.setImmediate(function () {
          var error = new NetConnectNotAllowedError(options.host, options.path);
          this.emit('error', error);
        }.bind(this));
      }
    }
  }
  inherits(OverriddenClientRequest, http.ClientRequest);

  //  Override the http module's request but keep the original so that we can use it and later restore it.
  //  NOTE: We only override http.ClientRequest as https module also uses it.
  originalClientRequest = http.ClientRequest;
  http.ClientRequest = OverriddenClientRequest;

  debug('ClientRequest overridden');
}

function restoreOverriddenClientRequest() {
  debug('restoring overriden ClientRequest');

  //  Restore the ClientRequest we have overridden.
  if(!originalClientRequest) {
    debug('- ClientRequest was not overridden');
  } else {
    http.ClientRequest = originalClientRequest;
    originalClientRequest = undefined;

    debug('- ClientRequest restored');
  }
}

function isActive() {

  //  If ClientRequest has been overwritten by Nock then originalClientRequest is not undefined.
  //  This means that Nock has been activated.
  return !_.isUndefined(originalClientRequest);

}

function activate() {

  if(originalClientRequest) {
    throw new Error('Nock already active');
  }

  overrideClientRequest();

  // ----- Overriding http.request and https.request:

  common.overrideRequests(function(proto, overriddenRequest, options, callback) {

    //  NOTE: overriddenRequest is already bound to its module.

    var req,
        res;

    if (typeof options === 'string') {
      options = parse(options);
    }
    options.proto = proto;

    if (isOn() && hasHadInterceptors(options)) {

      var interceptors,
          matches = false,
          allowUnmocked = false;

      interceptors = interceptorsFor(options);

      interceptors.forEach(function(interceptor) {
        if (! allowUnmocked && interceptor.options.allowUnmocked) { allowUnmocked = true; }
        if (interceptor.matchIndependentOfBody(options)) { matches = true; }
      });

      if (! matches && allowUnmocked) {
        if (proto === 'https') {
          var ClientRequest = http.ClientRequest;
          http.ClientRequest = originalClientRequest;
          req = overriddenRequest(options, callback);
          http.ClientRequest = ClientRequest;
        } else {
          req = overriddenRequest(options, callback);
        }
        return req;
      }

      //  NOTE: Since we already overrode the http.ClientRequest we are in fact constructing
      //    our own OverriddenClientRequest.
      req = new http.ClientRequest(options);

      res = RequestOverrider(req, options, interceptors, remove);
      if (callback) {
        res.on('response', callback);
      }
      return req;
    } else {
      if (isOff() || isEnabledForNetConnect(options)) {
        return overriddenRequest(options, callback);
      } else {
        var error = new NetConnectNotAllowedError(options.host, options.path);
        return new ErroringClientRequest(error);
      }
    }
  });

}

activate();

module.exports = add;
module.exports.removeAll = removeAll;
module.exports.removeInterceptor = removeInterceptor;
module.exports.isOn = isOn;
module.exports.activate = activate;
module.exports.isActive = isActive;
module.exports.enableNetConnect = enableNetConnect;
module.exports.disableNetConnect = disableNetConnect;
module.exports.overrideClientRequest = overrideClientRequest;
module.exports.restoreOverriddenClientRequest = restoreOverriddenClientRequest;
