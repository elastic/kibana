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

import { getAggregatedStats } from './get_aggregated_stats';

const kibana = {
  kibana: {
    great: 'googlymoogly',
    versions: [{ version: '8675309', count: 1 }],
  },
  kibana_stats: {
    os: {
      platform: 'rocky',
      platformRelease: 'iv',
    },
  },
  localization: {
    locale: 'en',
    labelsCount: 0,
    integrities: {},
  },
  sun: { chances: 5 },
  clouds: { chances: 95 },
  rain: { chances: 2 },
  snow: { chances: 0 },
};

const getMockServer = (getCluster = jest.fn()) => ({
  log(tags: string[], message: string) {
    // eslint-disable-next-line no-console
    console.log({ tags, message });
  },
  config() {
    return {
      get(item: string) {
        switch (item) {
          case 'pkg.version':
            return '8675309-snapshot';
          default:
            throw Error(`unexpected config.get('${item}') received.`);
        }
      },
    };
  },
  plugins: {
    elasticsearch: { getCluster },
  },
});

const mockUsageCollection = (kibanaUsage = kibana) => ({
  bulkFetch: () => kibanaUsage,
  toObject: (data: any) => data,
});

describe('Telemetry Collection: Get Aggregated Stats', () => {
  test('OSS telemetry (no license nor X-Pack telemetry)', async () => {
    const callCluster = jest.fn(async (method: string, options: { path?: string }) => {
      switch (method) {
        case 'transport.request':
          if (options.path === '/_license' || options.path === '/_xpack/usage') {
            // eslint-disable-next-line no-throw-literal
            throw { statusCode: 404 };
          }
          return {};
        case 'info':
          return { cluster_uuid: 'test', cluster_name: 'test', version: { number: '8.0.0' } };
        default:
          return {};
      }
    });
    const usageCollection = mockUsageCollection();
    const server = getMockServer();

    const stats = await getAggregatedStats([{ clusterUuid: '1234' }], {
      callCluster,
      usageCollection,
      server,
    } as any);
    expect(stats[0].license).toBe(undefined);
    expect(stats.map(({ timestamp, ...rest }) => rest)).toMatchSnapshot();
  });

  test('X-Pack telemetry (license + X-Pack)', async () => {
    const callCluster = jest.fn(async (method: string, options: { path?: string }) => {
      switch (method) {
        case 'transport.request':
          if (options.path === '/_license') {
            return {
              license: { type: 'basic' },
            };
          }
          if (options.path === '/_xpack/usage') {
            return {};
          }
        case 'info':
          return { cluster_uuid: 'test', cluster_name: 'test', version: { number: '8.0.0' } };
        default:
          return {};
      }
    });
    const usageCollection = mockUsageCollection();
    const server = getMockServer();

    const stats = await getAggregatedStats([{ clusterUuid: '1234' }], {
      callCluster,
      usageCollection,
      server,
    } as any);
    expect(stats[0].license).toStrictEqual({ type: 'basic' });
    expect(stats.map(({ timestamp, ...rest }) => rest)).toMatchSnapshot();
  });
});
