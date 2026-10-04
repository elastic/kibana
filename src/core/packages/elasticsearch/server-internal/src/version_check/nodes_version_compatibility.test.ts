/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NodesInfo, NodesVersionCompatibility } from './nodes_version_compatibility';
import { mapNodesVersionCompatibility, sameCompatibility } from './nodes_version_compatibility';

const KIBANA_VERSION = '5.1.0';

const createNodes = (...versions: string[]): NodesInfo => ({
  nodes: Object.fromEntries(
    versions.map((version, index) => [
      `node-${index}`,
      {
        version,
        http: { publish_address: 'http_address' },
        ip: 'ip',
        name: `node-${index}`,
      },
    ])
  ),
});

describe('mapNodesVersionCompatibility', () => {
  it('rejects a non-SemVer-compliant node version', () => {
    const result = mapNodesVersionCompatibility(
      createNodes('615c621a8416c444941dc97b142a0122d5c878d0'),
      KIBANA_VERSION,
      false
    );

    expect(result.isCompatible).toBe(false);
  });

  it('reports a node that returned no version as incompatible, rather than throwing', () => {
    const { nodes } = createNodes('5.1.0');
    const withoutVersion = { ip: 'ip', name: 'node-1' } as NodesInfo['nodes'][string];
    const result = mapNodesVersionCompatibility(
      { nodes: { ...nodes, 'node-1': withoutVersion } },
      KIBANA_VERSION,
      false
    );

    expect(result.isCompatible).toBe(false);
    expect(result.incompatibleNodes).toHaveLength(1);
  });

  it('accepts matching and compatible node versions', () => {
    const result = mapNodesVersionCompatibility(
      createNodes('5.1.0', '5.2.0', '5.1.1-Beta1'),
      KIBANA_VERSION,
      false
    );

    expect(result.isCompatible).toBe(true);
  });

  it('reports incompatible nodes', () => {
    const result = mapNodesVersionCompatibility(
      createNodes('5.1.0', '5.2.0', '5.0.0'),
      KIBANA_VERSION,
      false
    );

    expect(result.isCompatible).toBe(false);
    expect(result.message).toMatchInlineSnapshot(
      `"This version of Kibana (v5.1.0) is incompatible with the following Elasticsearch nodes in your cluster: v5.0.0 @ http_address (ip)"`
    );
  });

  it('reports an incompatible node without an HTTP publish address', () => {
    const nodesInfo: NodesInfo = {
      nodes: { node: { version: '6.1.1', ip: 'ip', name: 'node' } },
    };
    const result = mapNodesVersionCompatibility(nodesInfo, KIBANA_VERSION, false);

    expect(result.isCompatible).toBe(false);
    expect(result.message).toMatchInlineSnapshot(
      `"This version of Kibana (v5.1.0) is incompatible with the following Elasticsearch nodes in your cluster: v6.1.1 @ undefined (ip)"`
    );
  });

  it('accepts incompatible nodes when version mismatch is ignored', () => {
    const result = mapNodesVersionCompatibility(
      createNodes('5.1.0', '5.2.0', '5.0.0'),
      KIBANA_VERSION,
      true
    );

    expect(result.isCompatible).toBe(true);
    expect(result.message).toMatchInlineSnapshot(
      `"Ignoring version incompatibility between Kibana v5.1.0 and the following Elasticsearch nodes: v5.0.0 @ http_address (ip)"`
    );
  });

  it('warns when a compatible node differs by patch version', () => {
    const result = mapNodesVersionCompatibility(createNodes('5.1.1'), KIBANA_VERSION, false);

    expect(result.isCompatible).toBe(true);
    expect(result.message).toMatchInlineSnapshot(
      `"You're running Kibana 5.1.0 with some different versions of Elasticsearch. Update Kibana or Elasticsearch to the same version to prevent compatibility issues: v5.1.1 @ http_address (ip)"`
    );
  });

  it('reports missing node information', () => {
    const result = mapNodesVersionCompatibility({ nodes: {} }, KIBANA_VERSION, false);

    expect(result).toEqual(
      expect.objectContaining({
        isCompatible: false,
        message: 'Unable to retrieve version information from Elasticsearch nodes.',
        nodesInfoRequestError: undefined,
      })
    );
  });

  it('includes the request error when node information cannot be retrieved', () => {
    const nodesInfoRequestError = new Error('connection refused');
    const result = mapNodesVersionCompatibility(
      { nodes: {}, nodesInfoRequestError },
      KIBANA_VERSION,
      false
    );

    expect(result).toEqual(
      expect.objectContaining({
        isCompatible: false,
        message:
          'Unable to retrieve version information from Elasticsearch nodes. connection refused',
        nodesInfoRequestError,
      })
    );
  });
});

describe('sameCompatibility', () => {
  const compatibilityOf = (nodes: NodesInfo & { nodesInfoRequestError?: Error }) =>
    mapNodesVersionCompatibility(nodes, KIBANA_VERSION, false);
  const withError = (message: string): NodesVersionCompatibility =>
    compatibilityOf({ nodes: {}, nodesInfoRequestError: new Error(message) });

  it('treats two compatibilities of the same cluster as equal', () => {
    expect(
      sameCompatibility(
        compatibilityOf(createNodes('5.1.0')),
        compatibilityOf(createNodes('5.1.0'))
      )
    ).toBe(true);
  });

  it('distinguishes a changed node version', () => {
    expect(
      sameCompatibility(
        compatibilityOf(createNodes('5.1.0')),
        compatibilityOf(createNodes('4.0.0'))
      )
    ).toBe(false);
  });

  it('distinguishes errors by message only', () => {
    expect(sameCompatibility(withError('boom'), withError('boom'))).toBe(true);
    expect(sameCompatibility(withError('boom'), withError('bang'))).toBe(false);
  });
});
