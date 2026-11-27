/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES and Kibana versions are locked, so Kibana should require that ES has the same version as
 * that defined in Kibana's package.json.
 */

import {
  esVersionCompatibleWithKibana,
  esVersionEqualsKibana,
} from './es_kibana_version_compatability';

/** @public */
export interface NodeInfo {
  version: string;
  ip: string;
  http?: {
    publish_address: string;
  };
  name: string;
}

export interface NodesInfo {
  nodes: {
    [key: string]: NodeInfo;
  };
}

export interface NodesVersionCompatibility {
  isCompatible: boolean;
  message?: string;
  incompatibleNodes: NodeInfo[];
  warningNodes: NodeInfo[];
  kibanaVersion: string;
  nodesInfoRequestError?: Error;
}

/** A node's identity for ordering and equality: its version, then its IP. Tolerates a response missing either. */
const compareNodes = (a: NodeInfo, b: NodeInfo): number =>
  (a.version ?? '').localeCompare(b.version ?? '') || (a.ip ?? '').localeCompare(b.ip ?? '');

const sameNodes = (a: NodeInfo[], b: NodeInfo[]): boolean =>
  a.length === b.length && a.every((node, i) => compareNodes(node, b[i]) === 0);

/** Are two compatibilities observably equal? Relies on the node lists being sorted by `compareNodes`. */
export const sameCompatibility = (
  prev: NodesVersionCompatibility,
  curr: NodesVersionCompatibility
): boolean =>
  prev.isCompatible === curr.isCompatible &&
  sameNodes(prev.incompatibleNodes, curr.incompatibleNodes) &&
  sameNodes(prev.warningNodes, curr.warningNodes) &&
  prev.nodesInfoRequestError?.message === curr.nodesInfoRequestError?.message;

function getHumanizedNodeName(node: NodeInfo) {
  const publishAddress = node?.http?.publish_address + ' ' || '';
  return 'v' + node.version + ' @ ' + publishAddress + '(' + node.ip + ')';
}

/** The outcome of a nodes info request: the nodes it returned, or the error it failed with. */
export type NodesInfoResult = { ok: true; value: NodesInfo } | { ok: false; error: Error };

const UNABLE_TO_RETRIEVE = 'Unable to retrieve version information from Elasticsearch nodes.';

/** The compatibility of the cluster a nodes info request reported on; a failed request is incompatible. */
export function compatibilityFromNodesInfo(
  result: NodesInfoResult,
  kibanaVersion: string,
  ignoreVersionMismatch: boolean
): NodesVersionCompatibility {
  if (!result.ok) {
    return {
      isCompatible: false,
      message: `${UNABLE_TO_RETRIEVE} ${result.error.message}`,
      incompatibleNodes: [],
      warningNodes: [],
      kibanaVersion,
      nodesInfoRequestError: result.error,
    };
  }

  const nodesInfo = result.value;
  if (Object.keys(nodesInfo.nodes ?? {}).length === 0) {
    return {
      isCompatible: false,
      message: UNABLE_TO_RETRIEVE,
      incompatibleNodes: [],
      warningNodes: [],
      kibanaVersion,
    };
  }

  const nodes = Object.keys(nodesInfo.nodes)
    .map((key) => nodesInfo.nodes[key])
    .map((node) => Object.assign({}, node, { name: getHumanizedNodeName(node) }))
    .sort(compareNodes); // stable order, so `sameCompatibility` can compare positionally

  // Aggregate incompatible ES nodes.
  const incompatibleNodes = nodes.filter(
    (node) => !esVersionCompatibleWithKibana(node.version, kibanaVersion)
  );

  // Aggregate ES nodes which should prompt a Kibana upgrade. It's acceptable
  // if ES and Kibana versions are not the same as long as they are not
  // incompatible, but we should warn about it.
  // Ignore version qualifiers https://github.com/elastic/elasticsearch/issues/36859
  const warningNodes = nodes.filter((node) => !esVersionEqualsKibana(node.version, kibanaVersion));

  // Note: If incompatible and warning nodes are present `message` only contains
  // an incompatibility notice.
  let message;
  if (incompatibleNodes.length > 0) {
    const incompatibleNodeNames = incompatibleNodes.map((node) => node.name).join(', ');
    if (ignoreVersionMismatch) {
      message = `Ignoring version incompatibility between Kibana v${kibanaVersion} and the following Elasticsearch nodes: ${incompatibleNodeNames}`;
    } else {
      message = `This version of Kibana (v${kibanaVersion}) is incompatible with the following Elasticsearch nodes in your cluster: ${incompatibleNodeNames}`;
    }
  } else if (warningNodes.length > 0) {
    const warningNodeNames = warningNodes.map((node) => node.name).join(', ');
    message =
      `You're running Kibana ${kibanaVersion} with some different versions of ` +
      'Elasticsearch. Update Kibana or Elasticsearch to the same ' +
      `version to prevent compatibility issues: ${warningNodeNames}`;
  }

  return {
    isCompatible: ignoreVersionMismatch || incompatibleNodes.length === 0,
    message,
    incompatibleNodes,
    warningNodes,
    kibanaVersion,
  };
}
