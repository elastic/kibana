/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { format } from 'url';
import del from 'del';
import { v4 as uuidv4 } from 'uuid';
import globby from 'globby';
import createArchiver from 'archiver';
import Fs from 'fs';
import { pipeline } from 'stream/promises';
import { Cluster } from '@kbn/es';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ArtifactLicense } from '@kbn/es';
import type { ServerlessOptions } from '@kbn/es/src/utils';
import { CI_PARALLEL_PROCESS_PREFIX } from '../ci_parallel_process_prefix';
import { esTestConfig } from './es_test_config';

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

export interface ICluster {
  ports: number[];
  nodes: Cluster[];
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
   * To prepare the snapshot:
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
  esServerlessOptions?: Pick<
    ServerlessOptions,
    'image' | 'tag' | 'resources' | 'host' | 'kibanaUrl' | 'projectType' | 'dataPath'
  >;
  esJavaOpts?: string;
  /**
   * License to run your cluster under. Keep in mind that a `trial` license
   * has an expiration date. If you are using a `dataArchive` with your tests,
   * you'll likely need to use `basic` or `gold` to prevent the test from failing
   * when the license expires.
   */
  license?: ArtifactLicense;
  log: ToolingLog;
  writeLogsToPath?: string;
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
  /**
   * Report to the creator of the es-test-cluster that the es node has exitted before stop() was called, allowing
   * this caller to react appropriately. If this is not passed then an uncatchable exception will be thrown
   */
  onEarlyExit?: (msg: string) => void;
  /**
   * Is this a serverless project
   */
  serverless?: boolean;
  /**
   * Files to mount inside ES containers
   */
  files?: string[];
}

export function createTestEsCluster<
  Options extends CreateTestEsClusterOptions = CreateTestEsClusterOptions
>(options: Options): EsTestCluster<Options> {
  const {
    port = esTestConfig.getPort(),
    password = 'changeme',
    license = 'basic',
    log,
    writeLogsToPath,
    basePath = Path.resolve(REPO_ROOT, '.es'),
    esFrom = esTestConfig.getBuildFrom(),
    esServerlessOptions,
    dataArchive,
    nodes = [{ name: 'node-01' }],
    esArgs: customEsArgs = [],
    esJavaOpts,
    clusterName: customClusterName = 'es-test-cluster',
    ssl,
    transportPort,
    onEarlyExit,
    files,
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
    sourcePath: Path.resolve(REPO_ROOT, '../elasticsearch'),
    password,
    license,
    basePath,
    esArgs,
    resources: files,
  };

  return new (class TestCluster {
    ports: number[] = [];
    nodes: Cluster[] = [];

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
      let disableEsTmpDir: boolean;

      // We only install once using the first node. If the cluster has
      // multiple nodes, they'll all share the same ESinstallation.
      const firstNode = this.nodes[0];
      if (esFrom === 'source') {
        ({ installPath, disableEsTmpDir } = await firstNode.installSource({
          sourcePath: config.sourcePath,
          license: config.license,
          password: config.password,
          basePath: config.basePath,
          esArgs: config.esArgs,
        }));
      } else if (esFrom === 'snapshot') {
        ({ installPath, disableEsTmpDir } = await firstNode.installSnapshot(config));
      } else if (esFrom === 'serverless') {
        if (!esServerlessOptions) {
          throw new Error(
            `'esServerlessOptions' must be defined to start Elasticsearch in serverless mode`
          );
        }
        await firstNode.runServerless({
          basePath,
          esArgs: customEsArgs,
          dataPath: `stateless-${clusterName}`,
          ...esServerlessOptions,
          port,
          clean: true,
          background: true,
          files,
          ssl,
          kill: true, // likely don't need this but avoids any issues where the ESS cluster wasn't cleaned up
          waitForReady: true,
        });
        return;
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

        nodeStartPromises.push(() => {
          log.info(`[es] starting node ${node.name} on port ${nodePort}`);
          return this.nodes[i].start(installPath, {
            password: config.password,
            esArgs: assignArgs(esArgs, overriddenArgs),
            esJavaOpts,
            // If we have multiple nodes, we shouldn't try setting up the native realm
            // right away or wait for ES to be green, the cluster isn't ready. So we only
            // set it up after the last node is started.
            skipSecuritySetup: this.nodes.length > 1 && i < this.nodes.length - 1,
            skipReadyCheck: this.nodes.length > 1 && i < this.nodes.length - 1,
            onEarlyExit,
            writeLogsToPath,
            disableEsTmpDir,
          });
        });
      }

      await Promise.all(extractDirectoryPromises.map((extract) => extract()));
      for (const start of nodeStartPromises) {
        await start();
      }
    }

    async stop() {
      const results = await Promise.allSettled(
        this.nodes.map(async (node, i) => {
          log.info(`[es] stopping node ${nodes[i].name}`);
          await node.stop();
        })
      );

      log.info('[es] stopped');
      await this.captureDebugFiles();
      this.handleStopResults(results);
    }

    private handleStopResults(results: Array<PromiseSettledResult<void>>) {
      const failures = results.flatMap((r) => (r.status === 'rejected' ? r : []));
      if (failures.length === 1) {
        throw failures[0].reason;
      }
      if (failures.length > 1) {
        throw new Error(
          `${failures.length} nodes failed:\n - ${failures
            .map((f) => f.reason.message)
            .join('\n - ')}`
        );
      }
    }

    async captureDebugFiles() {
      const debugFiles = await globby([`**/hs_err_pid*.log`, `**/replay_pid*.log`, `**/*.hprof`], {
        cwd: config.installPath,
        absolute: true,
      });

      if (!debugFiles.length) {
        log.info('[es] no debug files found, assuming es did not write any');
        return;
      }

      const uuid = uuidv4();
      const debugPath = Path.resolve(REPO_ROOT, `data/es_debug_${uuid}.tar.gz`);
      log.error(`[es] debug files found, archiving install to ${debugPath}`);
      const archiver = createArchiver('tar', { gzip: true });
      const promise = pipeline(archiver, Fs.createWriteStream(debugPath));

      const archiveDirname = `es_debug_${uuid}`;
      for (const name of Fs.readdirSync(config.installPath)) {
        if (name === 'modules' || name === 'jdk') {
          // drop these large and unnecessary directories
          continue;
        }

        const src = Path.resolve(config.installPath, name);
        const dest = Path.join(archiveDirname, name);
        const stat = Fs.statSync(src);
        if (stat.isDirectory()) {
          archiver.directory(src, dest);
        } else {
          archiver.file(src, { name: dest });
        }
      }

      archiver.finalize();
      await promise;

      // cleanup the captured debug files
      for (const path of debugFiles) {
        Fs.rmSync(path, { force: true });
      }
    }

    async cleanup() {
      log.info('[es] killing', this.nodes.length === 1 ? 'node' : `${this.nodes.length} nodes`);
      const results = await Promise.allSettled(
        this.nodes.map(async (node, i) => {
          log.info(`[es] stopping node ${nodes[i].name}`);
          // we are deleting this install, stop ES more aggressively
          await node.kill();
        })
      );

      await this.captureDebugFiles();
      await del(config.installPath, { force: true });
      log.info('[es] cleanup complete');
      this.handleStopResults(results);
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
