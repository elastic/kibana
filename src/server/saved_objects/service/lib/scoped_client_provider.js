/**
 * Provider for the Scoped Saved Object Client.
 *
 */
export class ScopedSavedObjectsClientProvider {

  _wrapperFactories = [];

  constructor({
    index,
    mappings,
    onBeforeWrite,
    defaultClientFactory
  }) {
    this._index = index;
    this._mappings = mappings;
    this._onBeforeWrite = onBeforeWrite;
    this._defaultClientFactory = defaultClientFactory;
    this._customClientFactory;
  }

  // the client wrapper factories are put at the front of the array, so that
  // when we use `reduce` below they're invoked in LIFO order. This is so that
  // if multiple plugins register their client wrapper factories, that we can use
  // the plugin dependencies/optionalDependencies to implicitly control the order
  // in which these are used. For example, if we have a plugin a that declares a
  // dependency on plugin b, that means that plugin b's client wrapper would want
  // to be able to run first when the SavedObjectClient methods are invoked to
  // provide additional context to plugin a's client wrapper.
  registerScopedSavedObjectsClientWrapperFactory(wrapperFactory) {
    this._wrapperFactories.unshift(wrapperFactory);
  }

  registerScopedSavedObjectsClientFactory(customClientFactory) {
    if (this._customClientFactory) {
      throw new Error(`custom client factory is already registered, can't register another one`);
    }

    this._customClientFactory = customClientFactory;
  }

  getScopedSavedObjectsClient(request) {
    const factory = this._customClientFactory || this._defaultClientFactory;
    const client = factory({
      request,
      index: this._index,
      mappings: this._mappings,
      onBeforeWrite: this._onBeforeWrite,
    });

    return this._wrapperFactories.reduce((clientToWrap, wrapperFactory) => {
      return wrapperFactory({
        request,
        client: clientToWrap,
      });
    }, client);
  }
}
