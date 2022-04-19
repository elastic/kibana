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

import { timer, of, from, Observable } from 'rxjs';
import { map, distinctUntilChanged, catchError, exhaustMap } from 'rxjs/operators';
import {
  esVersionCompatibleWithKibana,
  esVersionEqualsKibana,
} from './es_kibana_version_compatability';
import { Logger } from '../../logging';
import type { ElasticsearchClient } from '../client';

/** @public */
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

function getHumanizedNodeName(node: NodeInfo) {
  const publishAddress = node?.http?.publish_address + ' ' || '';
  return 'v' + node.version + ' @ ' + publishAddress + '(' + node.ip + ')';
}

export function mapNodesVersionCompatibility(
  nodesInfoResponse: NodesInfo & { nodesInfoRequestError?: Error },
  kibanaVersion: string,
  ignoreVersionMismatch: boolean
): NodesVersionCompatibility {
  if (Object.keys(nodesInfoResponse.nodes ?? {}).length === 0) {
    // Note: If the a nodesInfoRequestError is present, the message contains the nodesInfoRequestError.message as a suffix
    let message = `Unable to retrieve version information from Elasticsearch nodes.`;
    if (nodesInfoResponse.nodesInfoRequestError) {
      message = message + ` ${nodesInfoResponse.nodesInfoRequestError.message}`;
    }
    return {
      isCompatible: false,
      message,
      incompatibleNodes: [],
      warningNodes: [],
      kibanaVersion,
      nodesInfoRequestError: nodesInfoResponse.nodesInfoRequestError,
    };
  }
  const nodes = Object.keys(nodesInfoResponse.nodes)
    .sort() // Sorting ensures a stable node ordering for comparison
    .map((key) => nodesInfoResponse.nodes[key])
    .map((node) => Object.assign({}, node, { name: getHumanizedNodeName(node) }));

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
  let message: string | undefined;
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

// Returns true if NodesVersionCompatibility nodesInfoRequestError is the same
function compareNodesInfoErrorMessages(
  prev: NodesVersionCompatibility,
  curr: NodesVersionCompatibility
): boolean {
  return prev.nodesInfoRequestError?.message === curr.nodesInfoRequestError?.message;
}

// Returns true if two NodesVersionCompatibility entries match
function compareNodes(prev: NodesVersionCompatibility, curr: NodesVersionCompatibility) {
  const nodesEqual = (n: NodeInfo, m: NodeInfo) => n.ip === m.ip && n.version === m.version;
  return (
    curr.isCompatible === prev.isCompatible &&
    curr.incompatibleNodes.length === prev.incompatibleNodes.length &&
    curr.warningNodes.length === prev.warningNodes.length &&
    curr.incompatibleNodes.every((node, i) => nodesEqual(node, prev.incompatibleNodes[i])) &&
    curr.warningNodes.every((node, i) => nodesEqual(node, prev.warningNodes[i])) &&
    compareNodesInfoErrorMessages(curr, prev)
  );
}

/** @public */
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
        internalClient.nodes.info({
          filter_path: ['nodes.*.version', 'nodes.*.http.publish_address', 'nodes.*.ip'],
        })
      ).pipe(
        catchError((nodesInfoRequestError) => {
          return of({ nodes: {}, nodesInfoRequestError });
        })
      );
    }),
    map((nodesInfoResponse: NodesInfo & { nodesInfoRequestError?: Error }) =>
      mapNodesVersionCompatibility(nodesInfoResponse, kibanaVersion, ignoreVersionMismatch)
    ),
    distinctUntilChanged(compareNodes) // Only emit if there are new nodes or versions or if we return an error and that error changes
  );
};
