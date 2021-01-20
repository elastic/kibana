/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapNodesVersionCompatibility, pollEsNodesVersion, NodesInfo } from './ensure_es_version';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import { elasticsearchClientMock } from '../client/mocks';
import { take, delay } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import { of } from 'rxjs';

const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');

const KIBANA_VERSION = '5.1.0';

const createEsSuccess = elasticsearchClientMock.createSuccessTransportRequestPromise;
const createEsError = elasticsearchClientMock.createErrorTransportRequestPromise;

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
});

describe('pollEsNodesVersion', () => {
  let internalClient: ReturnType<typeof elasticsearchClientMock.createInternalClient>;
  const getTestScheduler = () =>
    new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

  beforeEach(() => {
    internalClient = elasticsearchClientMock.createInternalClient();
  });

  const nodeInfosSuccessOnce = (infos: NodesInfo) => {
    internalClient.nodes.info.mockImplementationOnce(() => createEsSuccess(infos));
  };
  const nodeInfosErrorOnce = (error: any) => {
    internalClient.nodes.info.mockImplementationOnce(() => createEsError(error));
  };

  it('returns iscCompatible=false and keeps polling when a poll request throws', (done) => {
    expect.assertions(3);
    const expectedCompatibilityResults = [false, false, true];
    jest.clearAllMocks();

    nodeInfosSuccessOnce(createNodes('5.1.0', '5.2.0', '5.0.0'));
    nodeInfosErrorOnce('mock request error');
    nodeInfosSuccessOnce(createNodes('5.1.0', '5.2.0', '5.1.1-Beta1'));

    pollEsNodesVersion({
      internalClient,
      esVersionCheckInterval: 1,
      ignoreVersionMismatch: false,
      kibanaVersion: KIBANA_VERSION,
      log: mockLogger,
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

  it('returns compatibility results', (done) => {
    expect.assertions(1);
    const nodes = createNodes('5.1.0', '5.2.0', '5.0.0');

    nodeInfosSuccessOnce(nodes);

    pollEsNodesVersion({
      internalClient,
      esVersionCheckInterval: 1,
      ignoreVersionMismatch: false,
      kibanaVersion: KIBANA_VERSION,
      log: mockLogger,
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

  it('only emits if the node versions changed since the previous poll', (done) => {
    expect.assertions(4);
    nodeInfosSuccessOnce(createNodes('5.1.0', '5.2.0', '5.0.0')); // emit
    nodeInfosSuccessOnce(createNodes('5.0.0', '5.1.0', '5.2.0')); // ignore, same versions, different ordering
    nodeInfosSuccessOnce(createNodes('5.1.1', '5.2.0', '5.0.0')); // emit
    nodeInfosSuccessOnce(createNodes('5.1.1', '5.1.2', '5.1.3')); // emit
    nodeInfosSuccessOnce(createNodes('5.1.1', '5.1.2', '5.1.3')); // ignore
    nodeInfosSuccessOnce(createNodes('5.0.0', '5.1.0', '5.2.0')); // emit, different from previous version

    pollEsNodesVersion({
      internalClient,
      esVersionCheckInterval: 1,
      ignoreVersionMismatch: false,
      kibanaVersion: KIBANA_VERSION,
      log: mockLogger,
    })
      .pipe(take(4))
      .subscribe({
        next: (result) => expect(result).toBeDefined(),
        complete: done,
        error: done,
      });
  });

  it('starts polling immediately and then every esVersionCheckInterval', () => {
    expect.assertions(1);

    // @ts-expect-error we need to return an incompatible type to use the testScheduler here
    internalClient.nodes.info.mockReturnValueOnce([
      { body: createNodes('5.1.0', '5.2.0', '5.0.0') },
    ]);
    // @ts-expect-error we need to return an incompatible type to use the testScheduler here
    internalClient.nodes.info.mockReturnValueOnce([
      { body: createNodes('5.1.1', '5.2.0', '5.0.0') },
    ]);

    getTestScheduler().run(({ expectObservable }) => {
      const expected = 'a 99ms (b|)';

      const esNodesCompatibility$ = pollEsNodesVersion({
        internalClient,
        esVersionCheckInterval: 100,
        ignoreVersionMismatch: false,
        kibanaVersion: KIBANA_VERSION,
        log: mockLogger,
      }).pipe(take(2));

      expectObservable(esNodesCompatibility$).toBe(expected, {
        a: mapNodesVersionCompatibility(
          createNodes('5.1.0', '5.2.0', '5.0.0'),
          KIBANA_VERSION,
          false
        ),
        b: mapNodesVersionCompatibility(
          createNodes('5.1.1', '5.2.0', '5.0.0'),
          KIBANA_VERSION,
          false
        ),
      });
    });
  });

  it('waits for es version check requests to complete before scheduling the next one', () => {
    expect.assertions(2);

    getTestScheduler().run(({ expectObservable }) => {
      const expected = '100ms a 99ms (b|)';

      internalClient.nodes.info.mockReturnValueOnce(
        // @ts-expect-error we need to return an incompatible type to use the testScheduler here
        of({ body: createNodes('5.1.0', '5.2.0', '5.0.0') }).pipe(delay(100))
      );
      internalClient.nodes.info.mockReturnValueOnce(
        // @ts-expect-error we need to return an incompatible type to use the testScheduler here
        of({ body: createNodes('5.1.1', '5.2.0', '5.0.0') }).pipe(delay(100))
      );

      const esNodesCompatibility$ = pollEsNodesVersion({
        internalClient,
        esVersionCheckInterval: 10,
        ignoreVersionMismatch: false,
        kibanaVersion: KIBANA_VERSION,
        log: mockLogger,
      }).pipe(take(2));

      expectObservable(esNodesCompatibility$).toBe(expected, {
        a: mapNodesVersionCompatibility(
          createNodes('5.1.0', '5.2.0', '5.0.0'),
          KIBANA_VERSION,
          false
        ),
        b: mapNodesVersionCompatibility(
          createNodes('5.1.1', '5.2.0', '5.0.0'),
          KIBANA_VERSION,
          false
        ),
      });
    });

    expect(internalClient.nodes.info).toHaveBeenCalledTimes(2);
  });
});
