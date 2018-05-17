/**
 * Provider for the Saved Object Client.
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

  registerScopedSavedObjectsClientWrapperFactory(wrapperFactory) {
    this._wrapperFactories.push(wrapperFactory);
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
