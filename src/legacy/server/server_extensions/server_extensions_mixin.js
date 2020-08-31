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

export function serverExtensionsMixin(kbnServer, server) {
  /**
   *  Decorate all request objects with a new method, `methodName`,
   *  that will call the `factory` on first invocation and return
   *  the result of the first call to subsequent invocations.
   *
   *  @method server.addMemoizedFactoryToRequest
   *  @param {string} methodName location on the request this
   *                             factory should be added
   *  @param {Function} factory the factory to add to the request,
   *                            which will be called once per request
   *                            with a single argument, the request.
   *  @return {undefined}
   */
  server.decorate('server', 'addMemoizedFactoryToRequest', (methodName, factory) => {
    if (typeof methodName !== 'string') {
      throw new TypeError('methodName must be a string');
    }

    if (typeof factory !== 'function') {
      throw new TypeError('factory must be a function');
    }

    if (factory.length > 1) {
      throw new TypeError(`
        factory must not take more than one argument, the request object.
        Memoization is done based on the request instance and is cached and reused
        regardless of other arguments. If you want to have a per-request cache that
        also does some sort of secondary memoization then return an object or function
        from the memoized decorator and do secondary memoization there.
      `);
    }

    const requestCache = new WeakMap();
    server.decorate('request', methodName, function () {
      const request = this;

      if (!requestCache.has(request)) {
        requestCache.set(request, factory(request));
      }

      return requestCache.get(request);
    });
  });
}
