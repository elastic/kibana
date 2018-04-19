import { PrioritizedCollection } from './prioritized_collection';

/**
 * Provider for the Saved Object Client.
 */
class ClientProvider {
  constructor() {
    this._optionBuilders = new PrioritizedCollection('optionBuilders');
    this._wrappers = new PrioritizedCollection('savedObjectClientWrappers');
  }

  addClientOptionBuilder(builder, priority) {
    this._optionBuilders.add(builder, priority);
  }

  addClientWrapper(wrapper, priority) {
    this._wrappers.add(wrapper, priority);
  }

  createSavedObjectsClient(baseClientFactory, options) {
    const orderedBuilders = this._optionBuilders.toArray();
    const clientOptions = orderedBuilders.reduce((acc, builder) => builder(acc), options);

    const baseClient = baseClientFactory(clientOptions);

    const orderedWrappers = this._wrappers.toArray();
    return orderedWrappers.reduce((client, wrapper) => wrapper(client, clientOptions), baseClient);
  }
}

export const SavedObjectsClientProvider = new ClientProvider();
