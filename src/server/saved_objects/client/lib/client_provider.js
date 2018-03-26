
/**
 * The default Saved Object Client provider.
 * A custom implementation may be substituted by calling `SavedObjectClientProvider.setClientProvider`
 *
 * @param {*} server
 * @param {*} request
 */
const DEFAULT_PROVIDER = function savedObjectsClientProvider(server, request) {

  const cluster = server.plugins.elasticsearch.getCluster('admin');

  const callCluster = (...args) => cluster.callWithRequest(request, ...args);

  return server.savedObjectsClientFactory({ callCluster, request });
};

let activeProvider = DEFAULT_PROVIDER;

/**
 * Provider for the Saved Object Client.
 */
class ClientProvider {
  constructor() {
    this._activeProvider = DEFAULT_PROVIDER;
  }

  setClientProvider(provider) {
    if (activeProvider !== DEFAULT_PROVIDER) {
      throw new Error(`A Saved Objects Client Provider has already been registered. Registering multiple providers is not supported.`);
    }

    activeProvider = provider;
  }

  getClientProvider() {
    return activeProvider;
  }
}

export const SavedObjectClientProvider = new ClientProvider();
