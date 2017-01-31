import _ from 'lodash';
import Samples from './samples';
module.exports = function (kbnServer, server, config) {
  server.plugins['even-better'].monitor.on('ops', function (event) {
    const port = config.get('server.port');
    kbnServer.metrics = {
      process: {
        heap: {
          total_in_bytes: _.get(event, 'psmem.heapTotal'),
          used_in_bytes:  _.get(event, 'psmem.heapUsed')
        }
      },
      os: {
        load: {
          '1m': _.get(event, 'osload.0'),
          '5m': _.get(event, 'osload.1'),
          '15m': _.get(event, 'osload.1')
        }
      },
      response_times: {
        average:  _.get(event, ['responseTimes', port, 'avg']),
        max: _.get(event, ['responseTimes', port, 'max'])
      },
      requests:  _.get(event, ['requests', port]),
      concurrent_connections: _.get(event, ['concurrents', port])
    };

  });
};
