import { bindKey, partial } from 'lodash';
import elasticsearch from 'elasticsearch';

import callWithRequest from './call_with_request';
import filterHeaders from './filter_headers';
import createClient from './create_client';

module.exports = function (server, esIsTribe) {
  const config = server.config();

  class ElasticsearchAdminClientLogging {
    error(err) {
      server.log(['error', 'elasticsearch', 'admin'], err);
    }
    warning(message) {
      server.log(['warning', 'elasticsearch', 'admin'], message);
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
  server.expose('adminClient', client);
  server.expose('createAdminClient', createClient);
  server.expose('callAdminWithRequestFactory', partial(callWithRequest, server));
  server.expose('callAdminWithRequest', callWithRequest(server, noAuthClient));

  // server.expose('filterHeaders', filterHeaders);
  // server.expose('errors', elasticsearch.errors);

  return client;

};
