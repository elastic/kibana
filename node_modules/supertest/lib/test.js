/**
 * Module dependencies.
 */

var request = require('superagent')
  , util = require('util')
  , http = require('http')
  , https = require('https')
  , assert = require('assert')
  , Request = request.Request;

/**
 * Expose `Test`.
 */

module.exports = Test;

/**
 * Initialize a new `Test` with the given `app`,
 * request `method` and `path`.
 *
 * @param {Server} app
 * @param {String} method
 * @param {String} path
 * @api public
 */

function Test(app, method, path) {
  Request.call(this, method, path);
  this.redirects(0);
  this.buffer();
  this.app = app;
  this._asserts = [];
  this.url = 'string' == typeof app
    ? app + path
    : this.serverAddress(app, path);
}

/**
 * Inherits from `Request.prototype`.
 */

Test.prototype.__proto__ = Request.prototype;

/**
 * Returns a URL, extracted from a server.
 *
 * @param {Server} app
 * @param {String} path
 * @returns {String} URL address
 * @api private
 */

Test.prototype.serverAddress = function(app, path){
  var addr = app.address();
  if (!addr) this._server = app.listen(0);
  var port = app.address().port;
  var protocol = app instanceof https.Server ? 'https' : 'http';
  return protocol + '://127.0.0.1:' + port + path;
};

/**
 * Expectations:
 *
 *   .expect(200)
 *   .expect(200, fn)
 *   .expect(200, body)
 *   .expect('Some body')
 *   .expect('Some body', fn)
 *   .expect('Content-Type', 'application/json')
 *   .expect('Content-Type', 'application/json', fn)
 *   .expect(fn)
 *
 * @return {Test}
 * @api public
 */

Test.prototype.expect = function(a, b, c){
  // callback
  if ('function' == typeof a) {
    this._asserts.push(a);
    return this;
  }
  if ('function' == typeof b) this.end(b);
  if ('function' == typeof c) this.end(c);

  // status
  if ('number' == typeof a) {
    this._asserts.push(this._assertStatus.bind(this, a));
    // body
    if ('function' != typeof b && arguments.length > 1)
      this._asserts.push(this._assertBody.bind(this, b));
    return this;
  }

  // header field
  if ('string' == typeof b || 'number' == typeof b || b instanceof RegExp) {
    this._asserts.push(this._assertHeader.bind(this, {name: ''+a, value: b}));
    return this;
  }

  // body
  this._asserts.push(this._assertBody.bind(this, a));

  return this;
};

/**
 * Defer invoking superagent's `.end()` until
 * the server is listening.
 *
 * @param {Function} fn
 * @api public
 */

Test.prototype.end = function(fn){
  var self = this;
  var server = this._server;
  var end = Request.prototype.end;

  end.call(this, function(err, res){
    if (server && server._handle) return server.close(assert);

    assert();

    function assert(){
      self.assert(err, res, fn);
    }
  });

  return this;
};

/**
 * Perform assertions and invoke `fn(err, res)`.
 *
 * @param {?Error} resError
 * @param {Response} res
 * @param {Function} fn
 * @api private
 */

Test.prototype.assert = function(resError, res, fn){
  var error;

  // asserts
  for (var i = 0; i < this._asserts.length && !error; ++i) {
    error = this._assertFunction(this._asserts[i], res);
  }

  // set unexpected superagent error if no other error has occurred.
  if (!error && resError instanceof Error &&
      (!res || resError.status !== res.status))
    error = resError;

  fn.call(this, error || null, res);
};

/**
 * Perform assertions on a response body and return an Error upon failure.
 *
 * @param {Mixed} body
 * @param {Response} res
 * @return {?Error}
 * @api private
 */

Test.prototype._assertBody = function(body, res) {
  var isregexp = body instanceof RegExp;
  // parsed
  if ('object' == typeof body && !isregexp) {
    try {
      assert.deepEqual(body, res.body);
    } catch (err) {
      var a = util.inspect(body);
      var b = util.inspect(res.body);
      return error('expected ' + a + ' response body, got ' + b, body, res.body);
    }
  } else {
    // string
    if (body !== res.text) {
      var a = util.inspect(body);
      var b = util.inspect(res.text);

      // regexp
      if (isregexp) {
        if (!body.test(res.text)) {
          return error('expected body ' + b + ' to match ' + body, body, res.body);
        }
      } else {
        return error('expected ' + a + ' response body, got ' + b, body, res.body);
      }
    }
  }
};

/**
 * Perform assertions on a response header and return an Error upon failure.
 *
 * @param {Object} header
 * @param {Response} res
 * @return {?Error}
 * @api private
 */

Test.prototype._assertHeader = function(header, res) {
  var field = header.name;
  var actual = res.header[field.toLowerCase()];
  if (null == actual) return new Error('expected "' + field + '" header field');
  var fieldExpected = header.value;
  if (fieldExpected == actual) return;
  if (fieldExpected instanceof RegExp) {
    if (!fieldExpected.test(actual)) return new Error('expected "' + field + '" matching ' + fieldExpected + ', got "' + actual + '"');
  } else {
    return new Error('expected "' + field + '" of "' + fieldExpected + '", got "' + actual + '"');
  }
};

/**
 * Perform assertions on the response status and return an Error upon failure.
 *
 * @param {Number} status
 * @param {Response} res
 * @return {?Error}
 * @api private
 */

Test.prototype._assertStatus = function(status, res) {
  if (res.status !== status) {
    var a = http.STATUS_CODES[status];
    var b = http.STATUS_CODES[res.status];
    return new Error('expected ' + status + ' "' + a + '", got ' + res.status + ' "' + b + '"');
  }
};

/**
 * Performs an assertion by calling a function and return an Error upon failure.
 *
 * @param {Function} fn
 * @param {Response} res
 * @return {?Error}
 * @api private
 */
Test.prototype._assertFunction = function(check, res) {
  var err;
  try {
    err = check(res);
  } catch(e) {
    err = e;
  }
  if (err instanceof Error) return err;
};

/**
 * Return an `Error` with `msg` and results properties.
 *
 * @param {String} msg
 * @param {Mixed} expected
 * @param {Mixed} actual
 * @return {Error}
 * @api private
 */

function error(msg, expected, actual) {
  var err = new Error(msg);
  err.expected = expected;
  err.actual = actual;
  err.showDiff = true;
  return err;
}
