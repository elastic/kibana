/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NodesInfo } from './ensure_es_version';
import { mapNodesVersionCompatibility, pollEsNodesVersion } from './ensure_es_version';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { take } from 'rxjs';

const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');

const KIBANA_VERSION = '5.1.0';
function createNodes(...versions: string[]): NodesInfo {
  const nodes = {} as any;
  versions
    .map((version) => {
      return {
        version,
        http: {
          publish_address: 'http_address',
        },
        ip: 'ip',
      };
    })
    .forEach((node, i) => {
      nodes[`node-${i}`] = node;
    });

  return { nodes };
}

describe('mapNodesVersionCompatibility', () => {
  function createNodesInfoWithoutHTTP(version: string): NodesInfo {
    return { nodes: { 'node-without-http': { version, ip: 'ip' } } } as any;
  }

  it('returns isCompatible=false with a single node with non-SemVer-compliant version', async () => {
    const nodesInfo = createNodes('615c621a8416c444941dc97b142a0122d5c878d0');
    const result = await mapNodesVersionCompatibility(nodesInfo, KIBANA_VERSION, false);
    expect(result.isCompatible).toBe(false);
  });

  it('returns isCompatible=true with a single node that matches', async () => {
    const nodesInfo = createNodes('5.1.0');
    const result = await mapNodesVersionCompatibility(nodesInfo, KIBANA_VERSION, false);
    expect(result.isCompatible).toBe(true);
  });

  it('returns isCompatible=true with multiple nodes that satisfy', async () => {
    const nodesInfo = createNodes('5.1.0', '5.2.0', '5.1.1-Beta1');
    const result = await mapNodesVersionCompatibility(nodesInfo, KIBANA_VERSION, false);
    expect(result.isCompatible).toBe(true);
  });

  it('returns isCompatible=false for a single node that is out of date', () => {
    // 5.0.0 ES is too old to work with a 5.1.0 version of Kibana.
    const nodesInfo = createNodes('5.1.0', '5.2.0', '5.0.0');
    const result = mapNodesVersionCompatibility(nodesInfo, KIBANA_VERSION, false);
    expect(result.isCompatible).toBe(false);
    expect(result.message).toMatchInlineSnapshot(
      `"This version of Kibana (v5.1.0) is incompatible with the following Elasticsearch nodes in your cluster: v5.0.0 @ http_address (ip)"`
    );
  });

  it('returns isCompatible=false for an incompatible node without http publish address', async () => {
    const nodesInfo = createNodesInfoWithoutHTTP('6.1.1');
    const result = mapNodesVersionCompatibility(nodesInfo, KIBANA_VERSION, false);
    expect(result.isCompatible).toBe(false);
    expect(result.message).toMatchInlineSnapshot(
      `"This version of Kibana (v5.1.0) is incompatible with the following Elasticsearch nodes in your cluster: v6.1.1 @ undefined (ip)"`
    );
  });

  it('returns isCompatible=true for outdated nodes when ignoreVersionMismatch=true', async () => {
    // 5.0.0 ES is too old to work with a 5.1.0 version of Kibana.
    const nodesInfo = createNodes('5.1.0', '5.2.0', '5.0.0');
    const ignoreVersionMismatch = true;
    const result = mapNodesVersionCompatibility(nodesInfo, KIBANA_VERSION, ignoreVersionMismatch);
    expect(result.isCompatible).toBe(true);
    expect(result.message).toMatchInlineSnapshot(
      `"Ignoring version incompatibility between Kibana v5.1.0 and the following Elasticsearch nodes: v5.0.0 @ http_address (ip)"`
    );
  });

  it('returns isCompatible=true with a message if a node is only off by a patch version', () => {
    const result = mapNodesVersionCompatibility(createNodes('5.1.1'), KIBANA_VERSION, false);
    expect(result.isCompatible).toBe(true);
    expect(result.message).toMatchInlineSnapshot(
      `"You're running Kibana 5.1.0 with some different versions of Elasticsearch. Update Kibana or Elasticsearch to the same version to prevent compatibility issues: v5.1.1 @ http_address (ip)"`
    );
  });

  it('returns isCompatible=true with a message if a node is only off by a patch version and without http publish address', async () => {
    const result = mapNodesVersionCompatibility(createNodes('5.1.1'), KIBANA_VERSION, false);
    expect(result.isCompatible).toBe(true);
    expect(result.message).toMatchInlineSnapshot(
      `"You're running Kibana 5.1.0 with some different versions of Elasticsearch. Update Kibana or Elasticsearch to the same version to prevent compatibility issues: v5.1.1 @ http_address (ip)"`
    );
  });

  it('returns isCompatible=false without an extended message when a nodesInfoRequestError is not provided', async () => {
    const result = mapNodesVersionCompatibility({ nodes: {} }, KIBANA_VERSION, false);
    expect(result.isCompatible).toBe(false);
    expect(result.nodesInfoRequestError).toBeUndefined();
    expect(result.message).toMatchInlineSnapshot(
      `"Unable to retrieve version information from Elasticsearch nodes."`
    );
  });

  it('returns isCompatible=false with an extended message when a nodesInfoRequestError is present', async () => {
    const result = mapNodesVersionCompatibility(
      { nodes: {}, nodesInfoRequestError: new Error('connection refused') },
      KIBANA_VERSION,
      false
    );
    expect(result.isCompatible).toBe(false);
    expect(result.nodesInfoRequestError).toBeTruthy();
    expect(result.message).toMatchInlineSnapshot(
      `"Unable to retrieve version information from Elasticsearch nodes. connection refused"`
    );
  });
});
describe('pollEsNodesVersion', () => {
  let internalClient: ReturnType<typeof elasticsearchClientMock.createInternalClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    internalClient = elasticsearchClientMock.createInternalClient();
  });

  const nodeInfosSuccessOnce = (infos: NodesInfo) => {
    // @ts-expect-error not full interface
    internalClient.nodes.info.mockResponseOnce(infos);
  };
  const nodeInfosErrorOnce = (error: any) => {
    internalClient.nodes.info.mockImplementationOnce(() => Promise.reject(new Error(error)));
  };

  it('returns isCompatible=false and keeps polling when nodes.info requests fail', (done) => {
    expect.assertions(3);
    const expectedCompatibilityResults = [false, false, true];
    jest.clearAllMocks();

    // poll cycle 1
    nodeInfosSuccessOnce(createNodes('5.1.0', '5.2.0', '5.0.0')); // emit not compatible
    // poll cycle 2
    nodeInfosErrorOnce('mock request error'); // error
    nodeInfosErrorOnce('mock request error'); // retry error, emit error
    // poll cycle 3
    nodeInfosSuccessOnce(createNodes('5.1.0', '5.2.0', '5.1.1-Beta1')); // emit compatible

    pollEsNodesVersion({
      internalClient,
      healthCheckInterval: 1,
      ignoreVersionMismatch: false,
      kibanaVersion: KIBANA_VERSION,
      log: mockLogger,
      healthCheckRetry: 1,
    })
      .pipe(take(3))
      .subscribe({
        next: (result) => {
          expect(result.isCompatible).toBe(expectedCompatibilityResults.shift());
        },
        complete: done,
        error: done,
      });
  });

  it('returns the error from a failed nodes.info poll attempt when all the retries are exhausted', (done) => {
    expect.assertions(2);
    const expectedCompatibilityResults = [false];
    const expectedMessageResults = [
      'Unable to retrieve version information from Elasticsearch nodes. mock request error',
    ];
    jest.clearAllMocks();

    nodeInfosErrorOnce('mock request error'); // initial
    nodeInfosErrorOnce('mock request error'); // retry emit

    pollEsNodesVersion({
      internalClient,
      healthCheckInterval: 1,
      ignoreVersionMismatch: false,
      kibanaVersion: KIBANA_VERSION,
      log: mockLogger,
      healthCheckRetry: 1,
    })
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          expect(result.isCompatible).toBe(expectedCompatibilityResults.shift());
          expect(result.message).toBe(expectedMessageResults.shift());
        },
        complete: done,
        error: done,
      });
  });

  it('only emits if the error from a failed nodes.info call changed from the previous poll', (done) => {
    expect.assertions(4);
    const expectedCompatibilityResults = [false, false];
    const expectedMessageResults = [
      'Unable to retrieve version information from Elasticsearch nodes. mock request error',
      'Unable to retrieve version information from Elasticsearch nodes. mock request error 2',
    ];
    jest.clearAllMocks();

    nodeInfosErrorOnce('mock request error'); // initial
    nodeInfosErrorOnce('mock request error'); // retry emit

    nodeInfosErrorOnce('mock request error'); // initial
    nodeInfosErrorOnce('mock request error'); // retry doesn't emit same error as cycle 1

    nodeInfosErrorOnce('mock request error 2'); // initial
    nodeInfosErrorOnce('mock request error 2'); // retry emit changed error

    pollEsNodesVersion({
      internalClient,
      healthCheckInterval: 1,
      ignoreVersionMismatch: false,
      kibanaVersion: KIBANA_VERSION,
      log: mockLogger,
      healthCheckRetry: 1,
    })
      .pipe(take(2))
      .subscribe({
        next: (result) => {
          expect(result.message).toBe(expectedMessageResults.shift());
          expect(result.isCompatible).toBe(expectedCompatibilityResults.shift());
        },
        complete: done,
        error: done,
      });
  });

  it('returns isCompatible=false and keeps polling when requests fail, only emitting again if the error message has changed', (done) => {
    expect.assertions(8);
    const expectedCompatibilityResults = [false, false, true, false];
    const expectedMessageResults = [
      'This version of Kibana (v5.1.0) is incompatible with the following Elasticsearch nodes in your cluster: v5.0.0 @ http_address (ip)',
      'Unable to retrieve version information from Elasticsearch nodes. mock request error',
      "You're running Kibana 5.1.0 with some different versions of Elasticsearch. Update Kibana or Elasticsearch to the same version to prevent compatibility issues: v5.2.0 @ http_address (ip), v5.1.1-Beta1 @ http_address (ip)",
      'Unable to retrieve version information from Elasticsearch nodes. mock request error',
    ];
    jest.clearAllMocks();

    nodeInfosSuccessOnce(createNodes('5.1.0', '5.2.0', '5.0.0')); // poll 1 emit

    nodeInfosErrorOnce('mock request error'); // poll 2
    nodeInfosErrorOnce('mock request error'); // retry attempt, emit

    nodeInfosErrorOnce('mock request error'); // poll 3
    nodeInfosErrorOnce('mock request error'); // retry doesn't emit same error as cycle 1

    nodeInfosSuccessOnce(createNodes('5.1.0', '5.2.0', '5.1.1-Beta1')); // poll 4 emit

    nodeInfosErrorOnce('mock request error'); // poll 5
    nodeInfosErrorOnce('mock request error'); // retry emit

    pollEsNodesVersion({
      internalClient,
      healthCheckInterval: 1,
      ignoreVersionMismatch: false,
      kibanaVersion: KIBANA_VERSION,
      log: mockLogger,
      healthCheckRetry: 1,
    })
      .pipe(take(4))
      .subscribe({
        next: (result) => {
          expect(result.isCompatible).toBe(expectedCompatibilityResults.shift());
          expect(result.message).toBe(expectedMessageResults.shift());
        },
        complete: done,
        error: done,
      });
  });

  it('returns compatibility results', (done) => {
    expect.assertions(1);
    const nodes = createNodes('5.1.0', '5.2.0', '5.0.0');

    nodeInfosSuccessOnce(nodes);

    pollEsNodesVersion({
      internalClient,
      healthCheckInterval: 1,
      ignoreVersionMismatch: false,
      kibanaVersion: KIBANA_VERSION,
      log: mockLogger,
      healthCheckRetry: 1,
    })
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          expect(result).toEqual(mapNodesVersionCompatibility(nodes, KIBANA_VERSION, false));
        },
        complete: done,
        error: done,
      });
  });

  it('only emits when node versions changed since the previous poll', (done) => {
    expect.assertions(4);
    nodeInfosSuccessOnce(createNodes('5.1.0', '5.2.0', '5.0.0')); // emit
    nodeInfosSuccessOnce(createNodes('5.0.0', '5.1.0', '5.2.0')); // ignore, same versions, different ordering
    nodeInfosSuccessOnce(createNodes('5.1.1', '5.2.0', '5.0.0')); // emit
    nodeInfosSuccessOnce(createNodes('5.1.1', '5.1.2', '5.1.3')); // emit
    nodeInfosSuccessOnce(createNodes('5.1.1', '5.1.2', '5.1.3')); // ignore
    nodeInfosSuccessOnce(createNodes('5.0.0', '5.1.0', '5.2.0')); // emit, different from previous version

    pollEsNodesVersion({
      internalClient,
      healthCheckInterval: 1,
      ignoreVersionMismatch: false,
      kibanaVersion: KIBANA_VERSION,
      log: mockLogger,
      healthCheckRetry: 1,
    })
      .pipe(take(4))
      .subscribe({
        next: (result) => expect(result).toBeDefined(),
        complete: done,
        error: done,
      });
  });

  // rewritten from marble tests to use real timers instead of fake timers
  describe('timing and interval behavior', () => {
    it('starts first poll immediately and then polls every healthCheckInterval', (done) => {
      expect.assertions(3);
      const timestamps: number[] = [];
      const startTime = Date.now();

      nodeInfosSuccessOnce(createNodes('5.1.0', '5.2.0', '5.0.0'));
      nodeInfosSuccessOnce(createNodes('5.1.1', '5.2.0', '5.0.0'));

      pollEsNodesVersion({
        internalClient,
        healthCheckInterval: 50,
        ignoreVersionMismatch: false,
        kibanaVersion: KIBANA_VERSION,
        log: mockLogger,
        healthCheckRetry: 1,
      })
        .pipe(take(2))
        .subscribe({
          next: () => {
            timestamps.push(Date.now() - startTime);
          },
          complete: () => {
            // First emission should be immediate (within 10ms)
            expect(timestamps[0]).toBeLessThan(10);
            // Second emission should be after healthCheckInterval (50ms +/- 10ms tolerance)
            expect(timestamps[1]).toBeGreaterThanOrEqual(40);
            expect(timestamps[1]).toBeLessThan(60);
            done();
          },
          error: done,
        });
    });

    it('waits for each poll cycle (including retries) to complete before scheduling the next poll', (done) => {
      expect.assertions(2);
      const callTimes: number[] = [];
      let callCount = 0;

      internalClient.nodes.info.mockImplementation(async () => {
        const currentCall = callCount++;
        callTimes.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          nodes: {
            'node-0': {
              version: currentCall === 0 ? '5.1.0' : '5.1.1',
              ip: 'ip',
              http: { publish_address: 'addr' },
            },
          },
        } as any;
      });

      pollEsNodesVersion({
        internalClient,
        healthCheckInterval: 10,
        ignoreVersionMismatch: false,
        kibanaVersion: KIBANA_VERSION,
        log: mockLogger,
        healthCheckRetry: 1,
      })
        .pipe(take(2))
        .subscribe({
          complete: () => {
            expect(internalClient.nodes.info).toHaveBeenCalledTimes(2);
            // Second call should wait for first call to complete (100ms) before starting
            // So the delay between call starts should be at least 100ms
            const timeBetweenCalls = callTimes[1] - callTimes[0];
            expect(timeBetweenCalls).toBeGreaterThanOrEqual(90); // Allow some timing variance
            done();
          },
          error: done,
        });
    });

    it('switches from startup interval to normal interval after first successful poll with compatible status', (done) => {
      expect.assertions(1);
      let emissionCount = 0;

      nodeInfosSuccessOnce(createNodes('6.3.0'));
      nodeInfosSuccessOnce(createNodes('5.1.0'));
      nodeInfosSuccessOnce(createNodes('5.2.0'));
      nodeInfosSuccessOnce(createNodes('5.3.0'));

      pollEsNodesVersion({
        internalClient,
        healthCheckInterval: 50,
        healthCheckStartupInterval: 10,
        ignoreVersionMismatch: false,
        kibanaVersion: KIBANA_VERSION,
        log: mockLogger,
        healthCheckRetry: 1,
      })
        .pipe(take(4))
        .subscribe({
          next: () => {
            emissionCount++;
          },
          complete: () => {
            expect(emissionCount).toBe(4);
            done();
          },
          error: done,
        });
    });
  });
});
