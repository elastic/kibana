/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';

export function PromiseServiceCreator($q, $timeout) {
  function Promise(fn) {
    if (typeof this === 'undefined')
      throw new Error('Promise constructor must be called with "new"');

    const defer = $q.defer();
    try {
      fn(defer.resolve, defer.reject);
    } catch (e) {
      defer.reject(e);
    }
    return defer.promise;
  }

  Promise.all = Promise.props = $q.all;
  Promise.resolve = function(val) {
    const defer = $q.defer();
    defer.resolve(val);
    return defer.promise;
  };
  Promise.reject = function(reason) {
    const defer = $q.defer();
    defer.reject(reason);
    return defer.promise;
  };
  Promise.cast = $q.when;
  Promise.delay = function(ms) {
    return $timeout(_.noop, ms);
  };
  Promise.method = function(fn) {
    return function() {
      const args = Array.prototype.slice.call(arguments);
      return Promise.try(fn, args, this);
    };
  };
  Promise.nodeify = function(promise, cb) {
    promise.then(function(val) {
      cb(void 0, val);
    }, cb);
  };
  Promise.map = function(arr, fn) {
    return Promise.all(
      arr.map(function(i, el, list) {
        return Promise.try(fn, [i, el, list]);
      })
    );
  };
  Promise.each = function(arr, fn) {
    const queue = arr.slice(0);
    let i = 0;
    return (function next() {
      if (!queue.length) return arr;
      return Promise.try(fn, [arr.shift(), i++]).then(next);
    })();
  };
  Promise.is = function(obj) {
    // $q doesn't create instances of any constructor, promises are just objects with a then function
    // https://github.com/angular/angular.js/blob/58f5da86645990ef984353418cd1ed83213b111e/src/ng/q.js#L335
    return obj && typeof obj.then === 'function';
  };
  Promise.halt = _.once(function() {
    const promise = new Promise(() => {});
    promise.then = _.constant(promise);
    promise.catch = _.constant(promise);
    return promise;
  });
  Promise.try = function(fn, args, ctx) {
    if (typeof fn !== 'function') {
      return Promise.reject(new TypeError('fn must be a function'));
    }

    let value;

    if (Array.isArray(args)) {
      try {
        value = fn.apply(ctx, args);
      } catch (e) {
        return Promise.reject(e);
      }
    } else {
      try {
        value = fn.call(ctx, args);
      } catch (e) {
        return Promise.reject(e);
      }
    }

    return Promise.resolve(value);
  };
  Promise.fromNode = function(takesCbFn) {
    return new Promise(function(resolve, reject) {
      takesCbFn(function(err, ...results) {
        if (err) reject(err);
        else if (results.length > 1) resolve(results);
        else resolve(results[0]);
      });
    });
  };
  Promise.race = function(iterable) {
    return new Promise((resolve, reject) => {
      for (const i of iterable) {
        Promise.resolve(i).then(resolve, reject);
      }
    });
  };

  return Promise;
}
