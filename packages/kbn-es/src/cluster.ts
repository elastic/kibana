/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import fsp from 'fs/promises';
import chalk from 'chalk';
import * as path from 'path';
import execa from 'execa';
import { Readable } from 'stream';
import { combineLatest, fromEvent, first } from 'rxjs';
import { Client } from '@elastic/elasticsearch';
import { promisify } from 'util';
import { CA_CERT_PATH, ES_NOPASSWORD_P12_PATH, extract } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';
import treeKill from 'tree-kill';
import { MOCK_IDP_REALM_NAME, ensureSAMLRoleMapping } from '@kbn/mock-idp-utils';
import { downloadSnapshot, installSnapshot, installSource, installArchive } from './install';
import { ES_BIN, ES_PLUGIN_BIN, ES_KEYSTORE_BIN } from './paths';
import {
  DockerOptions,
  extractConfigFiles,
  log as defaultLog,
  NativeRealm,
  parseEsLog,
  runDockerContainer,
  runServerlessCluster,
  ServerlessOptions,
  stopServerlessCluster,
  teardownServerlessClusterSync,
} from './utils';
import { createCliError } from './errors';
const treeKillAsync = promisify<number, string>(treeKill);
import { parseSettings, SettingsFilter } from './settings';
import { EsClusterExecOptions } from './cluster_exec_options';
import {
  DownloadSnapshotOptions,
  InstallArchiveOptions,
  InstallSnapshotOptions,
  InstallSourceOptions,
} from './install/types';
import { waitUntilClusterReady } from './utils/wait_until_cluster_ready';

// listen to data on stream until map returns anything but undefined
const firstResult = (stream: Readable, map: (data: Buffer) => string | true | undefined) =>
  new Promise((resolve) => {
    const onData = (data: any) => {
      const result = map(data);
      if (result !== undefined) {
        resolve(result);
        stream.removeListener('data', onData);
      }
    };
    stream.on('data', onData);
  });

interface StopOptions {
  gracefully: boolean;
}
export class Cluster {
  private log: ToolingLog;
  private ssl: boolean;
  private stopCalled: boolean;
  private process: execa.ExecaChildProcess | null;
  private outcome: Promise<void> | null;
  private serverlessNodes: string[];
  private setupPromise: Promise<unknown> | null;
  private stdioTarget: NodeJS.WritableStream | null;

  constructor({ log = defaultLog, ssl = false } = {}) {
    this.log = log.withType('@kbn/es Cluster');
    this.ssl = ssl;
    this.stopCalled = false;
    // Serverless Elasticsearch node names, started via Docker
    this.serverlessNodes = [];
    // properties used exclusively for the locally started Elasticsearch cluster
    this.process = null;
    this.outcome = null;
    this.setupPromise = null;
    this.stdioTarget = null;
  }

  /**
   * Builds and installs ES from source
   */
  async installSource(options: InstallSourceOptions) {
    this.log.info(chalk.bold('Installing from source'));
    return await this.log.indent(4, async () => {
      const { installPath, disableEsTmpDir } = await installSource({ log: this.log, ...options });

      return { installPath, disableEsTmpDir };
    });
  }

  /**
   * Download ES from a snapshot
   */
  async downloadSnapshot(options: DownloadSnapshotOptions) {
    this.log.info(chalk.bold('Downloading snapshot'));
    return await this.log.indent(4, async () => {
      const { downloadPath } = await downloadSnapshot({
        log: this.log,
        ...options,
      });

      return { downloadPath };
    });
  }

  /**
   * Download and installs ES from a snapshot
   */
  async installSnapshot(options: InstallSnapshotOptions) {
    this.log.info(chalk.bold('Installing from snapshot'));
    return await this.log.indent(4, async () => {
      const { installPath, disableEsTmpDir } = await installSnapshot({
        log: this.log,
        ...options,
      });

      return { installPath, disableEsTmpDir };
    });
  }

  /**
   * Installs ES from a local tar
   */
  async installArchive(archivePath: string, options?: InstallArchiveOptions) {
    this.log.info(chalk.bold('Installing from an archive'));
    return await this.log.indent(4, async () => {
      const { installPath, disableEsTmpDir } = await installArchive(archivePath, {
        log: this.log,
        ...(options || {}),
      });

      return { installPath, disableEsTmpDir };
    });
  }

  /**
   * Unpacks a tar or zip file containing the data directory for an ES cluster.
   */
  async extractDataDirectory(installPath: string, archivePath: string, extractDirName = 'data') {
    this.log.info(chalk.bold(`Extracting data directory`));
    await this.log.indent(4, async () => {
      // stripComponents=1 excludes the root directory as that is how our archives are
      // structured. This works in our favor as we can explicitly extract into the data dir
      const extractPath = path.resolve(installPath, extractDirName);
      this.log.info(`Data archive: ${archivePath}`);
      this.log.info(`Extract path: ${extractPath}`);

      await extract({
        archivePath,
        targetDir: extractPath,
        stripComponents: 1,
      });
    });
  }

  /**
   * Installs comma separated list of ES plugins to the specified path
   */
  async installPlugins(installPath: string, plugins: string, esJavaOpts?: string) {
    const javaOpts = this.getJavaOptions(esJavaOpts);
    for (const plugin of plugins.split(',')) {
      await execa(ES_PLUGIN_BIN, ['install', plugin.trim()], {
        cwd: installPath,
        env: {
          JAVA_HOME: '', // By default, we want to always unset JAVA_HOME so that the bundled JDK will be used
          ES_JAVA_OPTS: javaOpts,
        },
      });
    }
  }

  async configureKeystoreWithSecureSettingsFiles(
    installPath: string,
    secureSettingsFiles: string[][]
  ) {
    const env = { JAVA_HOME: '' };
    for (const [secureSettingName, secureSettingFile] of secureSettingsFiles) {
      this.log.info(
        `setting secure setting %s to %s`,
        chalk.bold(secureSettingName),
        chalk.bold(secureSettingFile)
      );
      await execa(ES_KEYSTORE_BIN, ['add-file', secureSettingName, secureSettingFile], {
        cwd: installPath,
        env,
      });
    }
  }

  /**
   * Starts ES and returns resolved promise once started
   */
  async start(installPath: string, options: EsClusterExecOptions) {
    // `exec` indents and we wait for our own end condition, so reset the indent level to it's current state after we're done waiting
    await this.log.indent(0, async () => {
      this.exec(installPath, options);

      await Promise.race([
        // wait for native realm to be setup and es to be started
        Promise.all([
          firstResult(this.process?.stdout!, (data: Buffer) => {
            if (/started/.test(data.toString('utf-8'))) {
              return true;
            }
          }),
          this.setupPromise,
        ]),

        // await the outcome of the process in case it exits before starting
        this.outcome?.then(() => {
          throw createCliError('ES exited without starting');
        }),
      ]);
    });

    if (options.onEarlyExit) {
      this.outcome
        ?.then(
          () => {
            if (!this.stopCalled && options.onEarlyExit) {
              options.onEarlyExit(`ES exitted unexpectedly`);
            }
          },
          (error: Error) => {
            if (!this.stopCalled && options.onEarlyExit) {
              options.onEarlyExit(`ES exitted unexpectedly: ${error.stack}`);
            }
          }
        )
        .catch((error: Error) => {
          throw new Error(`failure handling early exit: ${error.stack}`);
        });
    }
  }

  /**
   * Starts Elasticsearch and waits for Elasticsearch to exit
   */
  async run(installPath: string, options: EsClusterExecOptions) {
    // `exec` indents and we wait for our own end condition, so reset the indent level to it's current state after we're done waiting
    await this.log.indent(0, async () => {
      this.exec(installPath, options);

      // log native realm setup errors so they aren't uncaught
      this.setupPromise?.catch((error: Error) => {
        this.log.error(error);
        this.stop();
      });

      // await the final outcome of the process
      await this.outcome;
    });
  }

  /**
   * Stops cluster
   */
  private async stopCluster(options: StopOptions) {
    if (this.stopCalled) {
      return;
    }
    this.stopCalled = true;

    // Stop ES docker containers
    if (this.serverlessNodes.length) {
      return await stopServerlessCluster(this.log, this.serverlessNodes);
    }

    // Stop local ES process
    if (!this.process || !this.outcome) {
      throw new Error('ES has not been started');
    }

    const pid = this.process.pid;

    if (pid) {
      await treeKillAsync(pid, options.gracefully ? 'SIGTERM' : 'SIGKILL');
    } else {
      throw Error(`ES process pid is not defined, can't stop it`);
    }

    await this.outcome;
  }

  /**
   * Stops ES process, if it's running
   */
  async stop() {
    await this.stopCluster({ gracefully: true });
  }

  /**
   * Stops ES process without waiting for it to shutdown gracefully
   */
  async kill() {
    await this.stopCluster({ gracefully: false });
  }

  /**
   * Common logic from this.start() and this.run()
   *
   * Start the Elasticsearch process (stored at `this.process`)
   * and "pipe" its stdio to `this.log`. Also create `this.outcome`
   * which will be resolved/rejected when the process exits.
   */
  private exec(installPath: string, opts: EsClusterExecOptions) {
    const {
      skipSecuritySetup = false,
      reportTime = () => {},
      startTime,
      skipReadyCheck,
      readyTimeout,
      writeLogsToPath,
      disableEsTmpDir,
      ...options
    } = opts;

    if (this.process || this.outcome) {
      throw new Error('ES has already been started');
    }

    if (writeLogsToPath) {
      this.stdioTarget = fs.createWriteStream(writeLogsToPath, 'utf8');
      this.log.info(
        chalk.bold('Starting'),
        `and writing logs to ${path.resolve(process.cwd(), writeLogsToPath)}`
      );
    } else {
      this.log.info(chalk.bold('Starting'));
    }

    this.log.indent(4);

    const esArgs = new Map([
      ['action.destructive_requires_name', 'true'],
      ['cluster.routing.allocation.disk.threshold_enabled', 'false'],
      ['ingest.geoip.downloader.enabled', 'false'],
      ['search.check_ccs_compatibility', 'true'],
    ]);

    // options.esArgs overrides the default esArg values
    const _esArgs = options.esArgs
      ? Array.isArray(options.esArgs)
        ? options.esArgs
        : [options.esArgs]
      : [];
    for (const arg of _esArgs) {
      const [key, ...value] = arg.split('=');
      esArgs.set(key.trim(), value.join('=').trim());
    }

    // Add to esArgs if ssl is enabled
    if (this.ssl) {
      esArgs.set('xpack.security.http.ssl.enabled', 'true');
      // Include default keystore settings only if ssl isn't disabled by esArgs and keystore isn't configured.
      if (!esArgs.get('xpack.security.http.ssl.keystore.path')) {
        // We are explicitly using ES_NOPASSWORD_P12_PATH instead of ES_P12_PATH + ES_P12_PASSWORD. The reasoning for this is that setting
        // the keystore password using environment variables causes Elasticsearch to emit deprecation warnings.
        esArgs.set(`xpack.security.http.ssl.keystore.path`, ES_NOPASSWORD_P12_PATH);
        esArgs.set(`xpack.security.http.ssl.keystore.type`, `PKCS12`);
      }
    }

    const args = parseSettings(
      extractConfigFiles(
        Array.from(esArgs).map((e) => e.join('=')),
        installPath,
        { log: this.log }
      ),
      {
        filter: SettingsFilter.NonSecureOnly,
      }
    ).reduce(
      (acc: string[], [settingName, settingValue]) =>
        acc.concat(['-E', `${settingName}=${settingValue}`]),
      []
    );

    this.log.info('%s %s', ES_BIN, args.join(' '));
    const esJavaOpts = this.getJavaOptions(options.esJavaOpts);

    this.log.info('ES_JAVA_OPTS: %s', esJavaOpts);

    this.process = execa(ES_BIN, args, {
      cwd: installPath,
      env: {
        ...(installPath && !disableEsTmpDir
          ? { ES_TMPDIR: path.resolve(installPath, 'ES_TMPDIR') }
          : {}),
        ...process.env,
        JAVA_HOME: '', // By default, we want to always unset JAVA_HOME so that the bundled JDK will be used
        ES_JAVA_OPTS: esJavaOpts,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.setupPromise = Promise.all([
      // parse log output to find http port
      firstResult(this.process.stdout!, (data: Buffer) => {
        const match = data.toString('utf8').match(/HttpServer.+publish_address {[0-9.]+:([0-9]+)/);

        if (match) {
          return match[1];
        }
      }),

      // load the CA cert from disk if necessary
      this.ssl ? fsp.readFile(CA_CERT_PATH) : null,
    ]).then(async ([port, caCert]) => {
      const client = new Client({
        node: `${caCert ? 'https:' : 'http:'}//localhost:${port}`,
        auth: {
          username: 'elastic',
          password: options.password!,
        },
        tls: caCert
          ? {
              ca: caCert,
              rejectUnauthorized: true,
            }
          : undefined,
      });

      if (!skipReadyCheck) {
        await waitUntilClusterReady({
          client,
          expectedStatus: 'yellow',
          log: this.log,
          readyTimeout,
        });
      }

      // once the cluster is ready setup the realm
      if (!skipSecuritySetup) {
        const nativeRealm = new NativeRealm({
          log: this.log,
          elasticPassword: options.password,
          client,
        });

        await nativeRealm.setPasswords(options);

        const samlRealmConfigPrefix = `authc.realms.saml.${MOCK_IDP_REALM_NAME}.`;
        if (args.some((arg) => arg.includes(samlRealmConfigPrefix))) {
          await ensureSAMLRoleMapping(client);
        }
      }
      this.log.success('kbn/es setup complete');
    });

    let reportSent = false;
    // parse and forward es stdout to the log
    this.process.stdout!.on('data', (data) => {
      const chunk = data.toString();
      const lines = parseEsLog(chunk);
      lines.forEach((line) => {
        if (!reportSent && line.message.includes('publish_address')) {
          reportSent = true;
          reportTime(startTime, 'ready', {
            success: true,
          });
        }

        if (this.stdioTarget) {
          this.stdioTarget.write(chunk);
        } else {
          this.log.info(line.formattedMessage);
        }
      });
    });

    // forward es stderr to the log
    this.process.stderr!.on('data', (data) => {
      const chunk = data.toString();
      if (this.stdioTarget) {
        this.stdioTarget.write(chunk);
      } else {
        this.log.error(chalk.red(chunk.trim()));
      }
    });

    // close the stdio target if we have one defined
    if (this.stdioTarget) {
      combineLatest([
        fromEvent(this.process.stderr!, 'end'),
        fromEvent(this.process.stdout!, 'end'),
      ])
        .pipe(first())
        .subscribe(() => {
          this.stdioTarget?.end();
        });
    }

    // observe the exit code of the process and reflect in `this.outcome` promises
    const exitCode: Promise<number> = new Promise((resolve) => this.process?.once('exit', resolve));
    this.outcome = exitCode.then((code) => {
      if (this.stopCalled) {
        return;
      }

      // JVM exits with 143 on SIGTERM and 130 on SIGINT, dont' treat them as errors
      if (code > 0 && !(code === 143 || code === 130)) {
        reportTime(startTime, 'abort', {
          success: true,
          error: code,
        });
        throw createCliError(`ES exited with code ${code}`);
      } else {
        reportTime(startTime, 'error', {
          success: false,
          error: `exited with ${code}`,
        });
      }
    });
  }

  private getJavaOptions(opts: string | undefined) {
    let esJavaOpts = `${opts || ''} ${process.env.ES_JAVA_OPTS || ''}`;
    // ES now automatically sets heap size to 50% of the machine's available memory
    // so we need to set it to a smaller size for local dev and CI
    // especially because we currently run many instances of ES on the same machine during CI
    // inital and max must be the same, so we only need to check the max
    if (!esJavaOpts.includes('Xmx')) {
      // 1536m === 1.5g
      esJavaOpts += ' -Xms1536m -Xmx1536m';
    }
    return esJavaOpts.trim();
  }

  /**
   * Runs an Elasticsearch Serverless Docker cluster and returns node names
   */
  async runServerless(options: ServerlessOptions) {
    if (this.process || this.outcome) {
      throw new Error('ES stateful cluster has already been started');
    }

    if (this.serverlessNodes.length > 0) {
      throw new Error('ES serverless docker cluster has already been started');
    }

    if (!options.skipTeardown) {
      /**
       * Ideally would be async and an event like beforeExit or SIGINT,
       * but those events are not being triggered in FTR child process.
       */
      process.on('exit', () => teardownServerlessClusterSync(this.log, options));
    }

    this.serverlessNodes = await runServerlessCluster(this.log, options);

    return this.serverlessNodes;
  }

  /**
   * Run an Elasticsearch Docker container
   */
  async runDocker(options: DockerOptions) {
    if (this.process || this.outcome) {
      throw new Error('ES stateful cluster has already been started');
    }

    await runDockerContainer(this.log, options);
  }
}
