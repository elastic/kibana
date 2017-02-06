import _ from 'lodash';
import Samples from './samples';
import { keysToSnakeCaseShallow } from '../../utils/case_conversion';

module.exports = function (kbnServer, server, config) {
  server.plugins['even-better'].monitor.on('ops', function (event) {
    const port = config.get('server.port');
    const timestamp = new Date().toISOString();
    kbnServer.metrics = {
      last_updated: timestamp,
      collection_interval_in_millis: config.get('ops.interval'),
      uptime_in_millis: process.uptime() * 1000,
      process: {
        memory: {
          heap: {
            total_in_bytes: _.get(event, 'psmem.heapTotal'),
            used_in_bytes:  _.get(event, 'psmem.heapUsed')
          }
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
        average_in_millis:  _.get(event, ['responseTimes', port, 'avg']),
        max_in_millis: _.get(event, ['responseTimes', port, 'max'])
      },
      requests:  keysToSnakeCaseShallow(_.get(event, ['requests', port])),
      concurrent_connections: _.get(event, ['concurrents', port])
    };

  });
};
