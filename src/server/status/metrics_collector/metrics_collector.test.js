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

jest.mock('os', () => ({
  freemem: jest.fn(),
  totalmem: jest.fn()
}));

const mockProcessUptime = jest.fn().mockImplementation(() => 6666);
jest.mock('process', () => ({
  uptime: mockProcessUptime
}));

import os from 'os';
import sinon from 'sinon';
import { MetricsCollector } from './';

const mockServer = {};
const mockConfig = {
  get: sinon.stub(),
};
mockConfig.get.returns('test-123');
mockConfig.get.withArgs('server.port').returns(3000);

describe('Metrics Collector', () => {
  describe('initialize', () => {
    it('should return stub metrics', () => {
      const collector = new MetricsCollector(mockServer, mockConfig);
      expect(collector.getStats()).toMatchSnapshot();
    });
  });

  describe('collection', () => {
    os.freemem.mockImplementation(() => 12);
    os.totalmem.mockImplementation(() => 24);

    Object.defineProperty(process, 'pid', { value: 7777 });
    Object.defineProperty(process, 'uptime', { value: mockProcessUptime });

    let sandbox;
    let clock;
    beforeAll(() => {
      sandbox = sinon.createSandbox();
      clock = sandbox.useFakeTimers(1524174654366);
    });

    afterAll(() => {
      clock.restore();
      sandbox.restore();
    });

    it('should update stats with new data', async () => {
      const collector = new MetricsCollector(mockServer, mockConfig);

      await collector.collect({
        requests: {
          '3000': { total: 4, disconnects: 0, statusCodes: { '200': 4 } },
        },
        responseTimes: { '3000': { avg: 13, max: 13 } },
        sockets: { http: { total: 0 }, https: { total: 0 } },
        osload: [1.68017578125, 1.7685546875, 1.8154296875],
        osmem: { total: 17179869184, free: 3984404480 },
        psmem: {
          rss: 35307520,
          heapTotal: 15548416,
          heapUsed: 12911128,
          external: 25028,
        },
        concurrents: { '3000': 0 },
        osup: 965002,
        psup: 29.466,
        psdelay: 0.33843398094177246,
        host: 'spicy.local',
      });
      expect(collector.getStats()).toMatchSnapshot();
    });

    it('should accumulate counter metrics', async () => {
      const collector = new MetricsCollector(mockServer, mockConfig);

      await collector.collect({
        requests: {
          '3000': { total: 8, disconnects: 0, statusCodes: { '200': 8 } },
        },
        responseTimes: { '3000': { avg: 19, max: 19 } },
        sockets: { http: { total: 0 }, https: { total: 0 } },
        osload: [1.97119140625, 1.90283203125, 1.81201171875],
        osmem: { total: 17179869184, free: 3987533824 },
        psmem: {
          rss: 36085760,
          heapTotal: 15548416,
          heapUsed: 12996392,
          external: 25028,
        },
        concurrents: { '3000': 0 },
        osup: 965606,
        psup: 22.29,
        psdelay: 0.3764979839324951,
        host: 'spicy.local',
      });
      expect(collector.getStats()).toMatchSnapshot();

      await collector.collect({
        requests: {
          '3000': { total: 8, disconnects: 0, statusCodes: { '200': 8 } },
        },
        responseTimes: { '3000': { avg: 19, max: 19 } },
        sockets: { http: { total: 0 }, https: { total: 0 } },
        osload: [1.97119140625, 1.90283203125, 1.81201171875],
        osmem: { total: 17179869184, free: 3987533824 },
        psmem: {
          rss: 36085760,
          heapTotal: 15548416,
          heapUsed: 12996392,
          external: 25028,
        },
        concurrents: { '3000': 0 },
        osup: 965606,
        psup: 22.29,
        psdelay: 0.3764979839324951,
        host: 'spicy.local',
      });
      expect(collector.getStats()).toMatchSnapshot();

      await collector.collect({
        requests: {
          '3000': { total: 8, disconnects: 0, statusCodes: { '200': 8 } },
        },
        responseTimes: { '3000': { avg: 19, max: 19 } },
        sockets: { http: { total: 0 }, https: { total: 0 } },
        osload: [1.97119140625, 1.90283203125, 1.81201171875],
        osmem: { total: 17179869184, free: 3987533824 },
        psmem: {
          rss: 36085760,
          heapTotal: 15548416,
          heapUsed: 12996392,
          external: 25028,
        },
        concurrents: { '3000': 0 },
        osup: 965606,
        psup: 22.29,
        psdelay: 0.3764979839324951,
        host: 'spicy.local',
      });
      expect(collector.getStats()).toMatchSnapshot();
    });
  });
});
