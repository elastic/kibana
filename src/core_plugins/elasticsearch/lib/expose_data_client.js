import { bindKey, partial } from 'lodash';
import elasticsearch from 'elasticsearch';

import callWithRequest from './call_with_request';
import filterHeaders from './filter_headers';
import createClient from './create_client';

module.exports = function (server, esIsTribe) {
  const config = server.config();
  const esPlugins = server.plugins.elasticsearch;

  class ElasticsearchAdminClientLogging {
    error(err) {
      server.log(['error', 'elasticsearch', 'data'], err);
    }
    warning(message) {
      server.log(['warning', 'elasticsearch', 'data'], message);
    }
    info() {}
    debug() {}
    trace() {}
    close() {}
  }

  function createClientWithConfig(options = {}) {
    options = Object.assign(
      {},
      config.get('elasticsearch'),
      config.get('elasticsearch.tribe'),
      { log: ElasticsearchAdminClientLogging },
      options
    );

    return createClient(options);
  }

  const client = createClientWithConfig();
  server.on('close', bindKey(client, 'close'));

  const noAuthClient = createClientWithConfig({ auth: false });
  server.on('close', bindKey(noAuthClient, 'close'));

  server.expose('ElasticsearchAdminClientLogging', ElasticsearchAdminClientLogging);
  server.expose('dataClient', client);
  server.expose('createDataClient', createClientWithConfig);
  server.expose('callDataWithRequestFactory', partial(callWithRequest, server));
  server.expose('callDataWithRequest', callWithRequest(server, noAuthClient));

  server.expose('filterHeaders', filterHeaders);
  server.expose('errors', elasticsearch.errors);

  // maintain backwards compatability?
  server.expose('ElasticsearchClientLogging', esPlugins.ElasticsearchClientLogging);
  server.expose('client', esPlugins.dataClient);
  server.expose('createClient', esPlugins.createDataClient);
  server.expose('callWithRequestFactory', esPlugins.callDataWithRequestFactory);
  server.expose('callWithRequest', esPlugins.callDataWithRequest);

  return client;
};
