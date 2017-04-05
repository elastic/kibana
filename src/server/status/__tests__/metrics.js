import _ from 'lodash';
import expect from 'expect.js';
import sinon from 'sinon';
import mockFs from 'mock-fs';
import { cGroups as cGroupsFsStub } from './fs_stubs';

import { getMetrics } from '../metrics';

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

  const sampleConfig = {
    ops: {
      interval: 5000
    },
    server: {
      port: 5603
    }
  };

  describe('with cgroups', () => {
    it('should provide cgroups', async () => {
      const fsStub = cGroupsFsStub();
      const event = _.cloneDeep(mockOps);
      const config = { get: path => _.get(sampleConfig, path) };
      const kbnServer = { log: sinon.mock() };

      mockFs(fsStub.files);
      const metrics = await getMetrics(event, config, kbnServer);
      mockFs.restore();

      expect(_.get(metrics, 'os.cgroup')).to.eql({
        cpuacct: {
          control_group: `/${fsStub.hierarchy}`,
          usage_nanos: 357753491408,
        },
        cpu: {
          control_group: `/${fsStub.hierarchy}`,
          cfs_period_micros: 100000,
          cfs_quota_micros: 5000,
          stat: {
            number_of_elapsed_periods: 0,
            number_of_times_throttled: 10,
            time_throttled_nanos: 20
          }
        }
      });
    });

    it('can override cgroup path', async () => {
      const fsStub = cGroupsFsStub('foo');
      const event = _.cloneDeep(mockOps);
      const configOverride = Object.assign(sampleConfig, {
        cpu: {
          cgroup: {
            path: {
              override: '/foo'
            }
          }
        },

        cpuacct: {
          cgroup: {
            path: {
              override: '/foo'
            }
          }
        },
      });
      const config = { get: path => _.get(configOverride, path) };
      const kbnServer = { log: sinon.mock() };

      mockFs(fsStub.files);
      const metrics = await getMetrics(event, config, kbnServer);
      mockFs.restore();

      expect(_.get(metrics, 'os.cgroup')).to.eql({
        cpuacct: {
          control_group: `/foo`,
          usage_nanos: 357753491408,
        },
        cpu: {
          control_group: `/foo`,
          cfs_period_micros: 100000,
          cfs_quota_micros: 5000,
          stat: {
            number_of_elapsed_periods: 0,
            number_of_times_throttled: 10,
            time_throttled_nanos: 20
          }
        }
      });
    });
  });

  describe('without cgroups', () => {
    let metrics;
    beforeEach(async () => {
      const event = _.cloneDeep(mockOps);
      const config = { get: path => _.get(sampleConfig, path) };
      const kbnServer = { log: sinon.mock() };

      metrics = await getMetrics(event, config, kbnServer);
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
});
