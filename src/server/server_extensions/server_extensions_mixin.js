
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
        from the memoized decorator and do secordary memoization there.
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
