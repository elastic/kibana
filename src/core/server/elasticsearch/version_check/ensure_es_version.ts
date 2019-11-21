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

/**
 * ES and Kibana versions are locked, so Kibana should require that ES has the same version as
 * that defined in Kibana's package.json.
 */

import { coerce } from 'semver';
import { interval } from 'rxjs';
import { map, switchMap, catchError, distinctUntilChanged } from 'rxjs/operators';
import { isEsCompatibleWithKibana } from './is_es_compatible_with_kibana';
import { Logger } from '../../logging';
import { APICaller } from '..';

export interface EnsureVersionOptions {
  callWithInternalUser: APICaller;
  log: Logger;
  kibanaVersion: string;
  ignoreVersionMismatch: boolean;
  esVersionCheckInterval: number;
}

export interface NodesInfo {
  nodes: {
    [key: string]: NodeInfo;
  };
}

interface NodeInfo {
  version: string;
  ip: string;
  http: {
    publish_address: string;
  };
}

function getHumanizedNodeName(node: NodeInfo) {
  const publishAddress = node?.http?.publish_address + ' ' || '';
  return 'v' + node.version + ' @ ' + publishAddress + '(' + node.ip + ')';
}

export function mapNodesVersionCompatibility(
  nodesInfo: NodesInfo,
  kibanaVersion: string,
  ignoreVersionMismatch: boolean
) {
  const nodes = Object.keys(nodesInfo.nodes)
    .sort() // Sorting ensures a stable node ordering for comparison
    .map(key => nodesInfo.nodes[key])
    .map(node => Object.assign({}, node, { name: getHumanizedNodeName(node) }));

  // Aggregate incompatible ES nodes.
  const incompatibleNodes = nodes.filter(
    node => !isEsCompatibleWithKibana(node.version, kibanaVersion)
  );

  // Aggregate ES nodes which should prompt a Kibana upgrade. It's acceptable
  // if ES and Kibana versions are not the same so long as they are not
  // incompatible, but we should warn about it.
  // Ignore version qualifiers https://github.com/elastic/elasticsearch/issues/36859
  const warningNodes = nodes.filter(node => {
    const nodeSemVer = coerce(node.version);
    const kibanaSemver = coerce(kibanaVersion);
    return nodeSemVer && kibanaSemver && nodeSemVer.version !== kibanaSemver.version;
  });

  let message = {};
  if (incompatibleNodes.length > 0) {
    const incompatibleNodeNames = incompatibleNodes.map(node => node.name).join(', ');
    if (ignoreVersionMismatch) {
      message = `Ignoring version incompatibility between Kibana v${kibanaVersion} and the following Elasticsearch nodes: ${incompatibleNodeNames}`;
    } else {
      message = `This version of Kibana (v${kibanaVersion}) is incompatible with the following Elasticsearch nodes in your cluster: ${incompatibleNodeNames}`;
    }
  } else if (warningNodes.length > 0) {
    const warningNodeNames = warningNodes.map(node => node.name).join(', ');
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

export const pollEsNodesVersion = ({
  callWithInternalUser,
  log,
  kibanaVersion,
  ignoreVersionMismatch,
  esVersionCheckInterval: healthCheckInterval,
}: EnsureVersionOptions) => {
  log.debug('Checking Elasticsearch version');

  return interval(healthCheckInterval).pipe(
    switchMap(() => {
      return callWithInternalUser('nodes.info', {
        filterPath: ['nodes.*.version', 'nodes.*.http.publish_address', 'nodes.*.ip'],
      });
    }),
    // Log, but otherwise ignore 'nodes.info' request errors
    catchError((err, caught$) => {
      log.error('Unable to retrieve version information from Elasticsearch nodes.', err);
      return caught$;
    }),
    map((nodesInfo: NodesInfo) =>
      mapNodesVersionCompatibility(nodesInfo, kibanaVersion, ignoreVersionMismatch)
    ),
    // Only emit if the IP or version numbers of the nodes
    distinctUntilChanged((prev, curr) => {
      const nodesEqual = (n: NodeInfo, m: NodeInfo) => n.ip === m.ip && n.version === m.version;
      return (
        curr.incompatibleNodes.every((node, i) => nodesEqual(node, prev.incompatibleNodes[i])) &&
        curr.warningNodes.every((node, i) => nodesEqual(node, prev.warningNodes[i]))
      );
    })
  );
};
