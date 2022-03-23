/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { format } from 'url';
import del from 'del';
// @ts-expect-error in js
import { Cluster } from '@kbn/es';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/dev-utils';
import { CI_PARALLEL_PROCESS_PREFIX } from '../ci_parallel_process_prefix';
import { esTestConfig } from './es_test_config';

import { KIBANA_ROOT } from '../';

interface TestEsClusterNodesOptions {
  name: string;
  /**
   * Depending on the test you are running, it may be necessary to
   * configure a separate data archive for each node in the cluster.
   * In that case, you can configure each of the archive paths here.
   *
   * Specifying a top-level `dataArchive` is not necessary if you are using
   * this option; per-node archives will always be used if provided.
   */
  dataArchive?: string;
}

interface Node {
  installSource: (opts: Record<string, unknown>) => Promise<{ installPath: string }>;
  installSnapshot: (opts: Record<string, unknown>) => Promise<{ installPath: string }>;
  extractDataDirectory: (
    installPath: string,
    archivePath: string,
    extractDirName?: string
  ) => Promise<{ insallPath: string }>;
  start: (installPath: string, opts: Record<string, unknown>) => Promise<void>;
  stop: () => Promise<void>;
}

export interface ICluster {
  ports: number[];
  nodes: Node[];
  getStartTimeout: () => number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  cleanup: () => Promise<void>;
  getClient: () => Client;
  getHostUrls: () => string[];
}

export type EsTestCluster<Options extends CreateTestEsClusterOptions = CreateTestEsClusterOptions> =
  Options['nodes'] extends TestEsClusterNodesOptions[]
    ? ICluster
    : ICluster & { getUrl: () => string }; // Only allow use of `getUrl` if `nodes` option isn't provided.

export interface CreateTestEsClusterOptions {
  basePath?: string;
  clusterName?: string;
  /**
   * Path to data archive snapshot to run Elasticsearch with.
   * To prepare the the snapshot:
   * - run Elasticsearch server
   * - index necessary data
   * - stop Elasticsearch server
   * - go to Elasticsearch folder: cd .es/${ELASTICSEARCH_VERSION}
   * - archive data folder: zip -r my_archive.zip data
   */
  dataArchive?: string;
  /**
   * Elasticsearch configuration options. These are key/value pairs formatted as:
   * `['key.1=val1', 'key.2=val2']`
   */
  esArgs?: string[];
  esFrom?: string;
  esJavaOpts?: string;
  /**
   * License to run your cluster under. Keep in mind that a `trial` license
   * has an expiration date. If you are using a `dataArchive` with your tests,
   * you'll likely need to use `basic` or `gold` to prevent the test from failing
   * when the license expires.
   */
  license?: 'basic' | 'gold' | 'trial'; // | 'oss'
  log: ToolingLog;
  /**
   * Node-specific configuration if you wish to run a multi-node
   * cluster. One node will be added for each item in the array.
   *
   * If this option is not provided, the config will default
   * to a single-node cluster.
   *
   * @example
   * {
   *   nodes: [
   *     {
   *       name: 'node-01',
   *       dataArchive: Path.join(__dirname, 'path', 'to', 'data_01')
   * .   },
   *     {
   *       name: 'node-02',
   *       dataArchive: Path.join(__dirname, 'path', 'to', 'data_02')
   * .   },
   *   ],
   * }
   */
  nodes?: TestEsClusterNodesOptions[];
  /**
   * Password for the `elastic` user. This is set after the cluster has started.
   *
   * Defaults to `changeme`.
   */
  password?: string;
  /**
   * Port to run Elasticsearch on. If you configure a
   * multi-node cluster with the `nodes` option, this
   * port will be incremented by one for each added node.
   *
   * @example
   * {
   *   nodes: [
   *     {
   *       name: 'node-01',
   *       dataArchive: Path.join(__dirname, 'path', 'to', 'data_01')
   * .   },
   *     {
   *       name: 'node-02',
   *       dataArchive: Path.join(__dirname, 'path', 'to', 'data_02')
   * .   },
   *   ],
   *   port: 6200, // node-01 will use 6200, node-02 will use 6201
   * }
   */
  port?: number;
  /**
   * Should this ES cluster use SSL?
   */
  ssl?: boolean;
  /**
   * Explicit transport port for a single node to run on, or a string port range to use eg. '9300-9400'
   * defaults to the transport port from `packages/kbn-test/src/es/es_test_config.ts`
   */
  transportPort?: number | string;
}

export function createTestEsCluster<
  Options extends CreateTestEsClusterOptions = CreateTestEsClusterOptions
>(options: Options): EsTestCluster<Options> {
  const {
    port = esTestConfig.getPort(),
    password = 'changeme',
    license = 'basic',
    log,
    basePath = Path.resolve(KIBANA_ROOT, '.es'),
    esFrom = esTestConfig.getBuildFrom(),
    dataArchive,
    nodes = [{ name: 'node-01' }],
    esArgs: customEsArgs = [],
    esJavaOpts,
    clusterName: customClusterName = 'es-test-cluster',
    ssl,
    transportPort,
  } = options;

  const clusterName = `${CI_PARALLEL_PROCESS_PREFIX}${customClusterName}`;

  const defaultEsArgs = [
    `cluster.name=${clusterName}`,
    `transport.port=${transportPort ?? esTestConfig.getTransportPort()}`,
    // For multi-node clusters, we make all nodes master-eligible by default.
    ...(nodes.length > 1
      ? ['discovery.type=zen', `cluster.initial_master_nodes=${nodes.map((n) => n.name).join(',')}`]
      : ['discovery.type=single-node']),
  ];

  const esArgs = assignArgs(defaultEsArgs, customEsArgs);

  const config = {
    version: esTestConfig.getVersion(),
    installPath: Path.resolve(basePath, clusterName),
    sourcePath: Path.resolve(KIBANA_ROOT, '../elasticsearch'),
    password,
    license,
    basePath,
    esArgs,
  };

  return new (class TestCluster {
    ports: number[] = [];
    nodes: Node[] = [];

    constructor() {
      for (let i = 0; i < nodes.length; i++) {
        this.nodes.push(new Cluster({ log, ssl }));
        // If this isn't the first node, we increment the port of the last node
        this.ports.push(i === 0 ? port : port + i);
      }
    }

    getStartTimeout() {
      const second = 1000;
      const minute = second * 60;

      return esFrom === 'snapshot' ? 3 * minute : 6 * minute;
    }

    async start() {
      let installPath: string;

      // We only install once using the first node. If the cluster has
      // multiple nodes, they'll all share the same ESinstallation.
      const firstNode = this.nodes[0];
      if (esFrom === 'source') {
        installPath = (await firstNode.installSource(config)).installPath;
      } else if (esFrom === 'snapshot') {
        installPath = (await firstNode.installSnapshot(config)).installPath;
      } else if (Path.isAbsolute(esFrom)) {
        installPath = esFrom;
      } else {
        throw new Error(`unknown option esFrom "${esFrom}"`);
      }

      // Collect promises so we can run them in parallel
      const extractDirectoryPromises = [];
      const nodeStartPromises = [];

      for (let i = 0; i < this.nodes.length; i++) {
        const node = nodes[i];
        const nodePort = this.ports[i];
        const overriddenArgs = [`node.name=${node.name}`, `http.port=${nodePort}`];

        const archive = node.dataArchive || dataArchive;
        if (archive) {
          extractDirectoryPromises.push(async () => {
            const nodeDataDirectory = node.dataArchive ? `data-${node.name}` : 'data';
            overriddenArgs.push(`path.data=${Path.resolve(installPath, nodeDataDirectory)}`);
            return await this.nodes[i].extractDataDirectory(
              installPath,
              archive,
              nodeDataDirectory
            );
          });
        }

        nodeStartPromises.push(async () => {
          log.info(`[es] starting node ${node.name} on port ${nodePort}`);
          return await this.nodes[i].start(installPath, {
            password: config.password,
            esArgs: assignArgs(esArgs, overriddenArgs),
            esJavaOpts,
            // If we have multiple nodes, we shouldn't try setting up the native realm
            // right away or wait for ES to be green, the cluster isn't ready. So we only
            // set it up after the last node is started.
            skipNativeRealmSetup: this.nodes.length > 1 && i < this.nodes.length - 1,
            skipReadyCheck: this.nodes.length > 1 && i < this.nodes.length - 1,
          });
        });
      }

      await Promise.all(extractDirectoryPromises.map(async (extract) => await extract()));
      for (const start of nodeStartPromises) {
        await start();
      }
    }

    async stop() {
      const nodeStopPromises = [];
      for (let i = 0; i < this.nodes.length; i++) {
        nodeStopPromises.push(async () => {
          log.info(`[es] stopping node ${nodes[i].name}`);
          return await this.nodes[i].stop();
        });
      }
      await Promise.all(nodeStopPromises.map(async (stop) => await stop()));

      log.info('[es] stopped');
    }

    async cleanup() {
      await this.stop();
      await del(config.installPath, { force: true });
      log.info('[es] cleanup complete');
    }

    /**
     * Returns an ES Client to the configured cluster
     */
    getClient(): Client {
      return new Client({
        node: this.getHostUrls()[0],
        Connection: HttpConnection,
      });
    }

    getUrl() {
      if (this.nodes.length > 1) {
        throw new Error(
          '`getUrl()` can only be used with a single-node cluster. For multi-node clusters, use `getHostUrls()`.'
        );
      }

      const parts = esTestConfig.getUrlParts();
      parts.port = port;

      return format(parts);
    }

    /**
     * Returns a list of host URLs for the cluster. Intended for use
     * when configuring Kibana's `elasticsearch.hosts` in a test.
     *
     * If the cluster has multiple nodes, each node URL will be included
     * in this list.
     */
    getHostUrls(): string[] {
      return this.ports.map((p) => format({ ...esTestConfig.getUrlParts(), port: p }));
    }
  })() as EsTestCluster<Options>;
}

/**
 * Like `Object.assign`, but for arrays of `key=val` strings. Takes an arbitrary
 * number of arrays, and allows values in subsequent args to override previous
 * values for the same key.
 *
 * @example
 *
 * assignArgs(['foo=a', 'bar=b'], ['foo=c', 'baz=d']); // returns ['foo=c', 'bar=b', 'baz=d']
 */
function assignArgs(...args: string[][]): string[] {
  const toArgsObject = (argList: string[]) => {
    const obj: Record<string, string> = {};

    argList.forEach((arg) => {
      const [key, val] = arg.split('=');
      obj[key] = val;
    });

    return obj;
  };

  return Object.entries(
    args.reduce((acc, cur) => {
      return {
        ...acc,
        ...toArgsObject(cur),
      };
    }, {})
  ).map(([key, val]) => `${key}=${val}`);
}
