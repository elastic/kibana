/**
 * Provider for the Saved Object Client.
 */
export class SavedObjectsClientProvider {
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

  registerCustomClientFactory(customClientFactory) {
    if (this._customClientFactory) {
      throw new Error(`custom client factory is already registered, can't register another one`);
    }

    this._customClientFactory = customClientFactory;
  }

  createSavedObjectsClient(request) {
    const factory = this._customClientFactory || this._defaultClientFactory;
    return factory({
      request,
      index: this._index,
      mappings: this._mappings,
      onBeforeWrite: this._onBeforeWrite,
    });
  }
}
