
/**
 * Module dependencies.
 */

var Agent = require('superagent').agent
  , methods = require('methods')
  , http = require('http')
  , Test = require('./test');

/**
 * Expose `Agent`.
 */

module.exports = TestAgent;

/**
 * Initialize a new `TestAgent`.
 *
 * @param {Function|Server} app
 * @param {Object} options
 * @api public
 */

function TestAgent(app, options){
  if (!(this instanceof TestAgent)) return new TestAgent(app, options);
  if ('function' == typeof app) app = http.createServer(app);
  if (options) this._ca = options.ca;
  Agent.call(this);
  this.app = app;
}

/**
 * Inherits from `Agent.prototype`.
 */

TestAgent.prototype.__proto__ = Agent.prototype;

// override HTTP verb methods
methods.forEach(function(method){
  TestAgent.prototype[method] = function(url, fn){
    var req = new Test(this.app, method.toUpperCase(), url);
    req.ca(this._ca);

    req.on('response', this.saveCookies.bind(this));
    req.on('redirect', this.saveCookies.bind(this));
    req.on('redirect', this.attachCookies.bind(this, req));
    this.attachCookies(req);

    return req;
  };
});

TestAgent.prototype.del = TestAgent.prototype.delete;
