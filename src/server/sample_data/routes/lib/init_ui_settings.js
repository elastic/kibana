export function initUiSettings(server) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
  const callEndpoint = (endpoint, clientParams = {}, options = {}) => {
    return callWithRequest({}, endpoint, clientParams, options);
  };
  const savedObjectsClient = server.savedObjectsClientFactory({
    callCluster: callEndpoint
  });
  return server.uiSettingsServiceFactory({
    savedObjectsClient
  });
}
