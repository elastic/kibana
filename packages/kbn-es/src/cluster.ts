/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import fsp from 'fs/promises';
import chalk from 'chalk';
import { resolve as pathResolve, relative as pathRelative } from 'path';
import execa from 'execa';
import { Readable } from 'stream';
import Rx from 'rxjs';
import { Client } from '@elastic/elasticsearch';
import { promisify } from 'util';
import { CA_CERT_PATH, ES_NOPASSWORD_P12_PATH, extract } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';
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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const treeKillAsync = promisify(require('tree-kill'));
import { parseSettings, SettingsFilter } from './settings';
import { InstallSourceOptions } from './install/install_source';
import { DownloadSnapshotOptions, InstallSnapshotOptions } from './install/install_snapshot';
import { EsClusterExecOptions } from './cluster_exec_options';
import { InstallArchiveOptions } from './install/install_archive';

const DEFAULT_READY_TIMEOUT = 60 * 1000;

// listen to data on stream until map returns anything but undefined
const first = (stream: Readable, map: (data: Buffer) => string | true | undefined) =>
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
   * @param options InstallSourceOptions
   * @returns Promise<{ installPath: string }>
   */
  async installSource(options: InstallSourceOptions) {
    this.log.info(chalk.bold('Installing from source'));
    return await this.log.indent(4, async () => {
      const { installPath } = await installSource(options);
      return { installPath };
    });
  }

  /**
   * Download ES from a snapshot
   * @param options DownloadSnapshotOptions
   * @returns Promise<{ downloadPath: string }>
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
   * @param options InstallSnapshotOptions
   * @returns Promise<{ installPath: string }>
   */
  async installSnapshot(options: InstallSnapshotOptions) {
    this.log.info(chalk.bold('Installing from snapshot'));
    return await this.log.indent(4, async () => {
      const { installPath } = await installSnapshot({
        log: this.log,
        ...options,
      });

      return { installPath };
    });
  }

  /**
   * Installs ES from a local tar
   * @param path ES archive path
   * @param options InstallArchiveOptions
   * @returns Promise<{ installPath }>
   */
  async installArchive(path: string, options: InstallArchiveOptions) {
    this.log.info(chalk.bold('Installing from an archive'));
    return await this.log.indent(4, async () => {
      const { installPath } = await installArchive(path, {
        log: this.log,
        ...options,
      });

      return { installPath };
    });
  }

  /**
   * Unpacks a tar or zip file containing the data directory for an ES cluster.
   * @param installPath
   * @param archivePath
   * @param extractDirName by default 'data'
   */
  async extractDataDirectory(installPath: string, archivePath: string, extractDirName = 'data') {
    this.log.info(chalk.bold(`Extracting data directory`));
    await this.log.indent(4, async () => {
      // stripComponents=1 excludes the root directory as that is how our archives are
      // structured. This works in our favor as we can explicitly extract into the data dir
      const extractPath = pathResolve(installPath, extractDirName);
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
   * Starts ES and returns resolved promise once started
   * @param installPath
   * @param plugins comma separated list of plugins to install
   * @param esJavaOpts
   */
  async installPlugins(installPath: string, plugins: string, esJavaOpts: string | undefined) {
    const _esJavaOpts = this.javaOptions(esJavaOpts);
    for (const plugin of plugins.split(',')) {
      await execa(ES_PLUGIN_BIN, ['install', plugin.trim()], {
        cwd: installPath,
        env: {
          JAVA_HOME: '', // By default, we want to always unset JAVA_HOME so that the bundled JDK will be used
          ES_JAVA_OPTS: _esJavaOpts.trim(),
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
   * @param installPath
   * @param options EsClusterExecOptions
   */
  async start(installPath: string, options: EsClusterExecOptions) {
    // `exec` indents and we wait for our own end condition, so reset the indent level to it's current state after we're done waiting
    await this.log.indent(0, async () => {
      this.exec(installPath, options);

      await Promise.race([
        // wait for native realm to be setup and es to be started
        Promise.all([
          first(this.process?.stdout!, (data: Buffer) => {
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
   * @param installPath
   * @param options EsClusterExecOptions
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
   * @param options StopOptions
   * @returns Promise
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

    if (options.gracefully) {
      await treeKillAsync(this.process!.pid);
    } else {
      await treeKillAsync(this.process.pid, 'SIGKILL');
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
   * @param installPath
   * @param opts EsClusterExecOptions
   */
  private exec(installPath: string, opts: EsClusterExecOptions) {
    const {
      skipNativeRealmSetup = false,
      reportTime = () => {},
      startTime,
      skipReadyCheck,
      readyTimeout,
      writeLogsToPath,
      ...options
    } = opts;

    if (this.process || this.outcome) {
      throw new Error('ES has already been started');
    }

    if (writeLogsToPath) {
      this.stdioTarget = fs.createWriteStream(writeLogsToPath, 'utf8');
      this.log.info(
        chalk.bold('Starting'),
        `and writing logs to ${pathRelative(process.cwd(), writeLogsToPath)}`
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
    const esJavaOpts = this.javaOptions(options.esJavaOpts);

    this.log.info('ES_JAVA_OPTS: %s', esJavaOpts);

    this.process = execa(ES_BIN, args, {
      cwd: installPath,
      env: {
        ...(installPath ? { ES_TMPDIR: pathResolve(installPath, 'ES_TMPDIR') } : {}),
        ...process.env,
        JAVA_HOME: '', // By default, we want to always unset JAVA_HOME so that the bundled JDK will be used
        ES_JAVA_OPTS: esJavaOpts,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.setupPromise = Promise.all([
      // parse log output to find http port
      first(this.process.stdout!, (data: Buffer) => {
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
        await this.waitForClusterReady(client, readyTimeout);
      }

      // once the cluster is ready setup the native realm
      if (!skipNativeRealmSetup) {
        const nativeRealm = new NativeRealm({
          log: this.log,
          elasticPassword: options.password,
          client,
        });

        await nativeRealm.setPasswords(options);
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
      Rx.combineLatest([
        Rx.fromEvent(this.process.stderr!, 'end'),
        Rx.fromEvent(this.process.stdout!, 'end'),
      ])
        .pipe(Rx.first())
        .subscribe(() => {
          this.stdioTarget?.end();
        });
    }

    // observe the exit code of the process and reflect in _outcome promises
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

  async waitForClusterReady(client: Client, readyTimeout = DEFAULT_READY_TIMEOUT) {
    let attempt = 0;
    const start = Date.now();

    this.log.info('waiting for ES cluster to report a yellow or green status');

    while (true) {
      attempt += 1;

      try {
        const resp = await client.cluster.health();
        if (resp.status !== 'red') {
          return;
        }

        throw new Error(`not ready, cluster health is ${resp.status}`);
      } catch (error) {
        const timeSinceStart = Date.now() - start;
        if (timeSinceStart > readyTimeout) {
          const sec = readyTimeout / 1000;
          throw new Error(`ES cluster failed to come online with the ${sec} second timeout`);
        }

        if (error.message.startsWith('not ready,')) {
          if (timeSinceStart > 10_000) {
            this.log.warning(error.message);
          }
        } else {
          this.log.warning(
            `waiting for ES cluster to come online, attempt ${attempt} failed with: ${error.message}`
          );
        }

        const waitSec = attempt * 1.5;
        await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
      }
    }
  }

  javaOptions(esJavaOpts: string | undefined) {
    let _esJavaOpts = `${esJavaOpts || ''} ${process.env.ES_JAVA_OPTS || ''}`;

    // ES now automatically sets heap size to 50% of the machine's available memory
    // so we need to set it to a smaller size for local dev and CI
    // especially because we currently run many instances of ES on the same machine during CI
    // inital and max must be the same, so we only need to check the max
    if (!_esJavaOpts.includes('Xmx')) {
      // 1536m === 1.5g
      _esJavaOpts += ' -Xms1536m -Xmx1536m';
    }
    return _esJavaOpts.trim();
  }

  /**
   * Run an Elasticsearch Serverless Docker cluster
   * @param options ServerlessOptions
   */
  async runServerless(options: ServerlessOptions) {
    if (this.process) {
      throw new Error('ES stateful cluster has already been started');
    }

    if (this.serverlessNodes.length > 0) {
      throw new Error('ES serverless docker cluster has already been started');
    }

    this.serverlessNodes = await runServerlessCluster(this.log, options);

    if (options.teardown) {
      /**
       * Ideally would be async and an event like beforeExit or SIGINT,
       * but those events are not being triggered in FTR child process.
       */
      process.on('exit', () => teardownServerlessClusterSync(this.log, options));
    }
  }

  /**
   * Run an Elasticsearch Docker container
   * @param options DockerOptions
   */
  async runDocker(options: DockerOptions) {
    if (this.process) {
      throw new Error('ES stateful cluster has already been started');
    }

    await runDockerContainer(this.log, options);
  }
}
