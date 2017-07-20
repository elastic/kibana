import _ from 'lodash';
import expect from 'expect.js';
import sinon from 'sinon';
import mockFs from 'mock-fs';
import { cGroups as cGroupsFsStub } from './fs_stubs';

import { Metrics } from '../metrics';

describe('Metrics', function () {
  const sampleConfig = {
    ops: {
      interval: 5000
    },
    server: {
      port: 5603
    }
  };
  const config = { get: path => _.get(sampleConfig, path) };

  let metrics;

  beforeEach(() => {
    const server = { log: sinon.mock() };

    metrics = new Metrics(config, server);
  });

  afterEach(() => {
    mockFs.restore();
  });


  describe('capture', () => {
    it('merges all metrics', async () => {
      mockFs();
      sinon.stub(metrics, 'captureEvent').returns({ 'a': [{ 'b': 2 }, { 'd': 4 }] });
      sinon.stub(metrics, 'captureCGroupsIfAvailable').returns({ 'a': [{ 'c': 3 }, { 'e': 5 }] });
      sinon.stub(Date.prototype, 'toISOString').returns('2017-04-14T18:35:41.534Z');
      sinon.stub(process, 'uptime').returns(5000);

      const capturedMetrics = await metrics.capture();
      expect(capturedMetrics).to.eql({
        last_updated: '2017-04-14T18:35:41.534Z',
        collection_interval_in_millis: 5000,
        uptime_in_millis: 5000000,
        a: [ { b: 2, c: 3 }, { d: 4, e: 5 } ]
      });
    });
  });

  describe('captureEvent', () => {
    it('parses the hapi event', () => {
      const hapiEvent = {
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

      expect(metrics.captureEvent(hapiEvent)).to.eql({
        'concurrent_connections': 0,
        'os': {
          'cpu': {
            'load_average': {
              '15m': 1.89794921875,
              '1m': 2.20751953125,
              '5m': 2.02294921875
            }
          }
        },
        'process': {
          'mem': {
            'heap_max_in_bytes': 168194048,
            'heap_used_in_bytes': 130553400
          }
        },
        'requests': {
          'disconnects': 0,
          'status_codes': {
            '200': 22
          },
          'total': 22
        },
        'response_times': {
          'avg_in_millis': 1.8636363636363635,
          'max_in_millis': 4
        }
      });
    });
  });

  describe('captureCGroups', () => {
    afterEach(() => {
      mockFs.restore();
    });

    it('returns undefined if cgroups do not exist', async () => {
      mockFs();

      const stats = await metrics.captureCGroups();

      expect(stats).to.be(undefined);
    });

    it('returns cgroups', async () => {
      const fsStub = cGroupsFsStub();
      mockFs(fsStub.files);

      const capturedMetrics = await metrics.captureCGroups();

      expect(capturedMetrics).to.eql({
        os: {
          cgroup: {
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
          }
        }
      });
    });
  });

  describe('captureCGroupsIfAvailable', () => {
    afterEach(() => {
      mockFs.restore();
    });

    it('marks cgroups as unavailable and prevents subsequent calls', async () => {
      mockFs();
      sinon.spy(metrics, 'captureCGroups');

      expect(metrics.checkCGroupStats).to.be(true);

      await metrics.captureCGroupsIfAvailable();
      expect(metrics.checkCGroupStats).to.be(false);

      await metrics.captureCGroupsIfAvailable();
      sinon.assert.calledOnce(metrics.captureCGroups);
    });

    it('allows subsequent calls if cgroups are available', async () => {
      const fsStub = cGroupsFsStub();
      mockFs(fsStub.files);
      sinon.spy(metrics, 'captureCGroups');

      expect(metrics.checkCGroupStats).to.be(true);

      await metrics.captureCGroupsIfAvailable();
      expect(metrics.checkCGroupStats).to.be(true);

      await metrics.captureCGroupsIfAvailable();
      sinon.assert.calledTwice(metrics.captureCGroups);
    });
  });
});
