var methods = require("methods")
  , PromiseBluebird = require("bluebird")
  , supertest = require("supertest");

// Support SuperTest's historical `del` alias for `delete`
methods = methods.concat("del");

// Generate a SuperTest as Promised module that returns promise
// instances using the provided `Promise` constructor.
function makeModule(Promise) {
  var out;

  function toPromise() {
    var self = this;
    return new Promise(function (resolve, reject) {
      self.end(function (err, res) {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });
  }

  function then(onFulfilled, onRejected) {
    return this.toPromise().then(onFulfilled, onRejected);
  }

  // Creates a new object that wraps `factory`, where each HTTP method
  // (`get`, `post`, etc.) is overriden to inject a `then` method into
  // the returned `Test` instance.
  function wrap(factory) {
    var out = {};

    methods.forEach(function (method) {
      out[method] = function () {
        var test = factory[method].apply(factory, arguments);
        test.toPromise = toPromise;
        test.then = then;
        return test;
      };
    });

    return out;
  }

  out = function () {
    var request = supertest.apply(null, arguments);
    return wrap(request);
  }

  out.agent = function () {
    var agent = supertest.agent.apply(null, arguments);
    return wrap(agent);
  };

  return out;
}

// For backwards compatibility, we allow SuperTest as Promised to be
// used without an explicit `Promise` constructor. Pass these requests
// through to a default module that uses Bluebird promises.

var defaultModule = makeModule(PromiseBluebird);

module.exports = function (maybePromise) {
  if (typeof maybePromise.resolve === 'function' &&
      typeof maybePromise.reject === 'function') {
    return makeModule(maybePromise);
  }

  return defaultModule.apply(null, arguments);
}

module.exports.agent = defaultModule.agent;
