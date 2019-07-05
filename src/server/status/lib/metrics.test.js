/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('fs', () => ({
  readFile: jest.fn()
}));

jest.mock('os', () => ({
  freemem: jest.fn(),
  totalmem: jest.fn(),
  uptime: jest.fn(),
  platform: jest.fn(),
  release: jest.fn()
}));

jest.mock('process', () => ({
  uptime: jest.fn()
}));

import fs from 'fs';
import os from 'os';
import _ from 'lodash';
import sinon from 'sinon';
import { cGroups as cGroupsFsStub, setMockFiles, readFileMock } from './__mocks__/_fs_stubs';
import { Metrics } from './metrics';

describe('Metrics', function () {
  fs.readFile.mockImplementation(readFileMock);

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
    setMockFiles();
  });


  describe('capture', () => {
    it('merges all metrics', async () => {
      setMockFiles();
      sinon.stub(metrics, 'captureEvent').returns({ 'a': [{ 'b': 2 }, { 'd': 4 }], process: { uptime_ms: 1980 } });
      sinon.stub(metrics, 'captureCGroupsIfAvailable').returns({ 'a': [{ 'c': 3 }, { 'e': 5 }] });
      sinon.stub(Date.prototype, 'toISOString').returns('2017-04-14T18:35:41.534Z');

      const capturedMetrics = await metrics.capture();
      expect(capturedMetrics).toMatchObject({
        last_updated: '2017-04-14T18:35:41.534Z',
        collection_interval_in_millis: 5000,
        a: [ { b: 2, c: 3 }, { d: 4, e: 5 } ], process: { uptime_ms: 1980 }
      });
    });
  });

  describe('captureEvent', () => {
    it('parses the hapi event', async () => {
      sinon.stub(os, 'uptime').returns(12000);
      sinon.stub(process, 'uptime').returns(5000);

      os.freemem.mockImplementation(() => 12);
      os.totalmem.mockImplementation(() => 24);

      const pidMock = jest.fn();
      pidMock.mockReturnValue(8675309);
      Object.defineProperty(process, 'pid', { get: pidMock }); //

      const hapiEvent = {
        'requests': { '5603': { 'total': 22, 'disconnects': 0, 'statusCodes': { '200': 22 } } },
        'responseTimes': { '5603': { 'avg': 1.8636363636363635, 'max': 4 } },
        'osload': [2.20751953125, 2.02294921875, 1.89794921875],
        'osmem': { 'total': 17179869184, 'free': 102318080 },
        'osup': 1008991,
        'psup': 7.168,
        'psmem': { 'rss': 193716224, 'heapTotal': 168194048, 'heapUsed': 130553400, 'external': 1779619 },
        'concurrent_connections': 0,
        'psdelay': 1.6091690063476562,
        'host': 'blahblah.local'
      };

      expect(await metrics.captureEvent(hapiEvent)).toMatchObject({
        'concurrent_connections': 0,
        'os': {
          'load': {
            '15m': 1.89794921875,
            '1m': 2.20751953125,
            '5m': 2.02294921875
          },
          'memory': {
            'free_in_bytes': 12,
            'total_in_bytes': 24,
          },
          'uptime_in_millis': 12000000,
        },
        'process': {
          'memory': {
            'heap': {
              'total_in_bytes': 168194048,
              'used_in_bytes': 130553400,
            },
            'resident_set_size_in_bytes': 193716224,
          },
          'pid': 8675309
        },
        'requests': {
          'disconnects': 0,
          'total': 22
        },
        'response_times': {
          'avg_in_millis': 1.8636363636363635,
          'max_in_millis': 4
        },
      });
    });

    it('parses event with missing fields / NaN for responseTimes.avg', async () => {
      const hapiEvent = {
        requests: {
          '5603': { total: 22, disconnects: 0, statusCodes: { '200': 22 } },
        },
        responseTimes: { '5603': { avg: NaN, max: 4 } },
        host: 'blahblah.local',
      };

      expect(await metrics.captureEvent(hapiEvent)).toMatchObject({
        process: { memory: { heap: {} }, pid: 8675309, uptime_in_millis: 5000000 },
        os: {
          load: {},
          memory: { free_in_bytes: 12, total_in_bytes: 24 },
        },
        response_times: { max_in_millis: 4 },
        requests: { total: 22, disconnects: 0 },
      });
    });
  });

  describe('captureCGroups', () => {
    afterEach(() => {
      setMockFiles();
    });

    it('returns undefined if cgroups do not exist', async () => {
      setMockFiles();

      const stats = await metrics.captureCGroups();

      expect(stats).toBe(undefined);
    });

    it('returns cgroups', async () => {
      const fsStub = cGroupsFsStub();
      setMockFiles(fsStub.files);

      const capturedMetrics = await metrics.captureCGroups();

      expect(capturedMetrics).toMatchObject({
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
      setMockFiles();
    });

    it('marks cgroups as unavailable and prevents subsequent calls', async () => {
      setMockFiles();
      sinon.spy(metrics, 'captureCGroups');

      expect(metrics.checkCGroupStats).toBe(true);

      await metrics.captureCGroupsIfAvailable();
      expect(metrics.checkCGroupStats).toBe(false);

      await metrics.captureCGroupsIfAvailable();
      sinon.assert.calledOnce(metrics.captureCGroups);
    });

    it('allows subsequent calls if cgroups are available', async () => {
      const fsStub = cGroupsFsStub();
      setMockFiles(fsStub.files);
      sinon.spy(metrics, 'captureCGroups');

      expect(metrics.checkCGroupStats).toBe(true);

      await metrics.captureCGroupsIfAvailable();
      expect(metrics.checkCGroupStats).toBe(true);

      await metrics.captureCGroupsIfAvailable();
      sinon.assert.calledTwice(metrics.captureCGroups);
    });
  });
});
