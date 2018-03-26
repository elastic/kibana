/**
 * Registry for Saved Objects Client Request Interceptors.
 *
 * Interceptors will be invoked by the Saved Object Client prior to calling the ElasticSearch cluster,
 * which allows interceptors to modify or interrupt the process.
 */
class SavedObjectClientRequestInterceptorRegistry {
  constructor() {
    this._interceptorFactories = [];
  }

  registerInterceptorFactory(interceptorFactory) {
    if (typeof interceptorFactory !== 'function') {
      throw new Error(`Invalid interceptor factory - must be a function`);
    }

    this._interceptorFactories.push(interceptorFactory);
  }

  createInterceptorsForRequest(request) {
    const interceptors =  this._interceptorFactories.map(factory => factory(request));

    const anyInvalid = interceptors.some(
      interceptor => typeof interceptor.method !== 'string' || typeof interceptor.intercept !== 'function'
    );

    if (anyInvalid) {
      throw new Error(
        `One or more interceptors are invalid: each interceptor must include a 'method' property, and an 'intercept' function`
      );
    }

    return interceptors;
  }
}

export const SavedObjectClientInterceptorRegistry = new SavedObjectClientRequestInterceptorRegistry();
