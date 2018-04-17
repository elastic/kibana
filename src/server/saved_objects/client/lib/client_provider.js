import { SavedObjectsClient } from '../saved_objects_client';
import { PrioritizedCollection } from './prioritized_collection';

/**
 * The base Saved Objects Client.
 *
 * @param {*} server
 * @param {*} request
 */
function createBaseSavedObjectsClient(options) {

  const {
    server,
    mappings,
    callCluster,
    onBeforeWrite,
  } = options;

  return new SavedObjectsClient({
    index: server.config().get('kibana.index'),
    mappings,
    callCluster,
    onBeforeWrite
  });
}

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

  createWrappedSavedObjectsClient(options) {
    const orderedBuilders = this._optionBuilders.toArray();
    const clientOptions = orderedBuilders.reduce((acc, builder) => builder(acc), options);

    const baseClient = createBaseSavedObjectsClient(clientOptions);

    const orderedWrappers = this._wrappers.toArray();
    return orderedWrappers.reduce((client, wrapper) => wrapper(client, clientOptions), baseClient);
  }
}

export const SavedObjectsClientProvider = new ClientProvider();
