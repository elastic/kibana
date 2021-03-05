/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * ES and Kibana versions are locked, so Kibana should require that ES has the same version as
 * that defined in Kibana's package.json.
 */

import os from 'os';
import { timer, of, from, Observable } from 'rxjs';
import { map, distinctUntilChanged, catchError, exhaustMap } from 'rxjs/operators';
import {
  esVersionCompatibleWithKibana,
  esVersionEqualsKibana,
} from './es_kibana_version_compatability';
import { Logger } from '../../logging';
import type { ElasticsearchClient } from '../client';

export interface PollEsNodesVersionOptions {
  internalClient: ElasticsearchClient;
  log: Logger;
  kibanaVersion: string;
  ignoreVersionMismatch: boolean;
  esVersionCheckInterval: number;
}

interface NodeInfo {
  version: string;
  ip: string;
  http: {
    publish_address: string;
  };
  name: string;
  settings: {
    script: {
      allowed_types: string;
    };
  };
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
}

function getHumanizedNodeName(node: NodeInfo) {
  const publishAddress = node?.http?.publish_address ? node.http.publish_address + ' ' : '';
  return 'v' + node.version + ' @ ' + publishAddress + '(' + node.ip + ')';
}

export function mapNodesVersionCompatibility(
  nodesInfo: NodesInfo,
  kibanaVersion: string,
  ignoreVersionMismatch: boolean
): NodesVersionCompatibility {
  if (Object.keys(nodesInfo.nodes ?? {}).length === 0) {
    return {
      isCompatible: false,
      message: 'Unable to retrieve version information from Elasticsearch nodes.',
      incompatibleNodes: [],
      warningNodes: [],
      kibanaVersion,
    };
  }
  const nodes = Object.keys(nodesInfo.nodes)
    .sort() // Sorting ensures a stable node ordering for comparison
    .map((key) => nodesInfo.nodes[key])
    .map((node) => Object.assign({}, node, { name: getHumanizedNodeName(node) }));

  // Aggregate nodes that have scripts disabled
  const incompatibleNodesWithScriptsDisabled = nodes.filter(
    (node) => node.settings.script.allowed_types === 'none'
  );

  // Aggregate incompatible version ES nodes.
  const incompatibleVersionNodes = nodes.filter(
    (node) => !esVersionCompatibleWithKibana(node.version, kibanaVersion)
  );

  // Aggregate ES nodes which should prompt a Kibana upgrade. It's acceptable
  // if ES and Kibana versions are not the same as long as they are not
  // incompatible, but we should warn about it.
  // Ignore version qualifiers https://github.com/elastic/elasticsearch/issues/36859
  const warningVersionNodes = nodes.filter(
    (node) => !esVersionEqualsKibana(node.version, kibanaVersion)
  );

  const messages = [];
  if (incompatibleNodesWithScriptsDisabled.length > 0) {
    const incompatibleNodeNames = incompatibleNodesWithScriptsDisabled
      .map((node) => node.name)
      .join(', ');
    messages.push(
      `Kibana requires Elasticsearch inline scripts. The following nodes have inline scripts disabled: ${incompatibleNodeNames}`
    );
  }

  // Note: If incompatible and warning nodes are present `messages` only contains
  // an incompatibility notice.
  if (incompatibleVersionNodes.length > 0) {
    const incompatibleNodeNames = incompatibleVersionNodes.map((node) => node.name).join(', ');
    if (ignoreVersionMismatch) {
      messages.push(
        `Ignoring version incompatibility between Kibana v${kibanaVersion} and the following Elasticsearch nodes: ${incompatibleNodeNames}`
      );
    } else {
      messages.push(
        `This version of Kibana (v${kibanaVersion}) is incompatible with the following Elasticsearch nodes in your cluster: ${incompatibleNodeNames}`
      );
    }
  } else if (warningVersionNodes.length > 0) {
    const warningNodeNames = warningVersionNodes.map((node) => node.name).join(', ');
    messages.push(
      `You're running Kibana ${kibanaVersion} with some different versions of ` +
        'Elasticsearch. Update Kibana or Elasticsearch to the same ' +
        `version to prevent compatibility issues: ${warningNodeNames}`
    );
  }

  return {
    isCompatible:
      incompatibleNodesWithScriptsDisabled.length === 0 &&
      (ignoreVersionMismatch || incompatibleVersionNodes.length === 0),
    message: messages.join(os.EOL),
    incompatibleNodes: [...incompatibleNodesWithScriptsDisabled, ...incompatibleVersionNodes],
    warningNodes: warningVersionNodes,
    kibanaVersion,
  };
}

// Returns true if two NodesVersionCompatibility entries match
function compareNodes(prev: NodesVersionCompatibility, curr: NodesVersionCompatibility) {
  const nodesEqual = (n: NodeInfo, m: NodeInfo) => n.ip === m.ip && n.version === m.version;
  return (
    curr.isCompatible === prev.isCompatible &&
    curr.incompatibleNodes.length === prev.incompatibleNodes.length &&
    curr.warningNodes.length === prev.warningNodes.length &&
    curr.incompatibleNodes.every((node, i) => nodesEqual(node, prev.incompatibleNodes[i])) &&
    curr.warningNodes.every((node, i) => nodesEqual(node, prev.warningNodes[i]))
  );
}

export const pollEsNodesVersion = ({
  internalClient,
  log,
  kibanaVersion,
  ignoreVersionMismatch,
  esVersionCheckInterval: healthCheckInterval,
}: PollEsNodesVersionOptions): Observable<NodesVersionCompatibility> => {
  log.debug('Checking Elasticsearch version');
  return timer(0, healthCheckInterval).pipe(
    exhaustMap(() => {
      return from(
        internalClient.nodes.info<NodesInfo>({
          filter_path: [
            'nodes.*.version',
            'nodes.*.http.publish_address',
            'nodes.*.ip',
            'nodes.*.settings.script',
          ],
        })
      ).pipe(
        map(({ body }) => body),
        catchError((_err) => {
          return of({ nodes: {} });
        })
      );
    }),
    map((nodesInfo: NodesInfo) =>
      mapNodesVersionCompatibility(nodesInfo, kibanaVersion, ignoreVersionMismatch)
    ),
    distinctUntilChanged(compareNodes) // Only emit if there are new nodes or versions
  );
};
