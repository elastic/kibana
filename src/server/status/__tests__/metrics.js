import _ from 'lodash';
import expect from 'expect.js';

import { getV6Metrics } from '../metrics';

describe('Metrics', function () {
  const mockOps = {
    'requests': { '5603': { 'total': 22, 'disconnects': 0, 'statusCodes': { '200': 22 } } },
    'responseTimes': { '5603': { 'avg': 1.8636363636363635, 'max': 4 } },
    'sockets': {
      'http': { 'total': 0 },
      'https': { 'total': 0 }
    },
    'osload': [2.20751953125, 2.02294921875, 1.89794921875],
    'osmem': { 'total': 17179869184, 'free': 102318080 },
    'osup': 1008991,
    'psup': 7.168,
    'psmem': { 'rss': 193716224, 'heapTotal': 168194048, 'heapUsed': 130553400 },
    'concurrents': { '5603': 0 },
    'psdelay': 1.6091690063476562,
    'host': '123'
  };
  const config = {
    ops: {
      interval: 5000
    },
    server: {
      port: 5603
    }
  };

  let metrics;
  beforeEach(() => {
    metrics = getV6Metrics({
      event: _.cloneDeep(mockOps),
      config: {
        get: path => _.get(config, path)
      }
    });
  });

  it('should snake case the request object', () => {
    expect(metrics.requests.status_codes).not.to.be(undefined);
    expect(metrics.requests.statusCodes).to.be(undefined);
  });

  it('should provide defined metrics', () => {
    (function checkMetrics(currentMetric) {
      _.forOwn(currentMetric, value => {
        if (typeof value === 'object') return checkMetrics(value);
        expect(currentMetric).not.to.be(undefined);
      });

    }(metrics));
  });
});
