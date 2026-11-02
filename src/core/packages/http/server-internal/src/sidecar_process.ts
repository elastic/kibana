/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import type { Logger } from '@kbn/logging';
import type { HttpConfig } from './http_config';

const READY_TIMEOUT_MS = 30_000;
const MAX_RESTART_ATTEMPTS = 5;
const INITIAL_BACKOFF_MS = 1_000;

interface SidecarBootstrapConfig {
  host: string;
  port: number;
  socketPath: string;
  secret: string;
  tls?: {
    certificate: string;
    key: string;
  };
}

export class SidecarProcess {
  private proc: ChildProcess | null = null;
  private socketDir: string | null = null;
  private restartAttempts = 0;
  private stopped = false;

  public socketPath: string = '';
  public secret: string = '';

  constructor(
    private readonly config: HttpConfig,
    private readonly sidecarBinPath: string,
    private readonly log: Logger
  ) {}

  public async start(): Promise<void> {
    this.socketDir = await mkdtemp(join(tmpdir(), 'kbn-sidecar-'), { mode: 0o700 } as any);
    this.socketPath = join(this.socketDir, 'kbn.sock');
    this.secret = randomBytes(32).toString('hex');

    await this.spawn();
  }

  public async stop(): Promise<void> {
    this.stopped = true;
    if (this.proc) {
      const exitPromise = new Promise<void>((resolve) => {
        this.proc!.once('exit', () => resolve());
      });
      this.proc.stdin?.end();
      this.proc.kill('SIGTERM');
      await exitPromise;
      this.proc = null;
    }
    if (this.socketDir) {
      await rm(this.socketDir, { recursive: true, force: true }).catch(() => {});
      this.socketDir = null;
    }
  }

  private async spawn(): Promise<void> {
    const bootstrapConfig: SidecarBootstrapConfig = {
      host: this.config.host,
      port: this.config.port,
      socketPath: this.socketPath,
      secret: this.secret,
    };

    if (this.config.ssl.enabled) {
      const sslConfig = this.config.ssl;
      if (sslConfig.certificate && sslConfig.key) {
        bootstrapConfig.tls = {
          certificate: sslConfig.certificate,
          key: sslConfig.key,
        };
      }
    }

    const configJson = JSON.stringify(bootstrapConfig);

    this.log.info(`spawning sidecar process: ${this.sidecarBinPath}`);

    this.proc = spawn(this.sidecarBinPath, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
      env: {},
    });

    this.proc.stdout?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n').filter(Boolean)) {
        this.log.info(`[sidecar] ${line}`);
      }
    });

    this.proc.stderr?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n').filter(Boolean)) {
        this.log.error(`[sidecar] ${line}`);
      }
    });

    this.proc.on('exit', (code, signal) => {
      this.log.warn(`sidecar process exited (code=${code}, signal=${signal})`);
      if (!this.stopped) {
        this.handleUnexpectedExit();
      }
    });

    this.proc.stdin!.write(configJson);

    await this.waitForReady();
    this.restartAttempts = 0;
  }

  private waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const fd3 = (this.proc!.stdio as Readable[])[3];
      if (!fd3) {
        reject(new Error('sidecar fd 3 not available'));
        return;
      }

      const cleanup = () => {
        clearTimeout(timeout);
        fd3.removeListener('data', onData);
        fd3.removeListener('error', onError);
        fd3.destroy();
      };

      const onData = (data: Buffer) => {
        const msg = data.toString().trim();
        cleanup();
        if (msg === 'READY') {
          this.log.info('sidecar process is ready');
          resolve();
        } else {
          reject(new Error(`unexpected ready signal from sidecar: ${msg}`));
        }
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`sidecar did not signal ready within ${READY_TIMEOUT_MS}ms`));
      }, READY_TIMEOUT_MS);

      fd3.once('data', onData);
      fd3.once('error', onError);
    });
  }

  private handleUnexpectedExit(): void {
    this.restartAttempts++;
    if (this.restartAttempts > MAX_RESTART_ATTEMPTS) {
      this.log.fatal(
        `sidecar failed to stay up after ${MAX_RESTART_ATTEMPTS} attempts, shutting down`
      );
      process.exit(1);
    }

    const backoff = INITIAL_BACKOFF_MS * Math.pow(2, this.restartAttempts - 1);
    this.log.warn(`restarting sidecar in ${backoff}ms (attempt ${this.restartAttempts})`);

    setTimeout(() => {
      if (!this.stopped) {
        this.spawn().catch((err) => {
          this.log.error(`failed to restart sidecar: ${err.message}`);
          this.handleUnexpectedExit();
        });
      }
    }, backoff);
  }
}
