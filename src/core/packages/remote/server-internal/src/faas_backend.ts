/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { createServer, type Socket } from 'node:net';
import { performance } from 'node:perf_hooks';
import { promisify } from 'node:util';
import { RpcSession } from 'capnweb';
import type { RemoteWorkerSpec, RpcCallMeasurement } from '@kbn/core-remote-common';
import { CoordinatorGateway } from './coordinator_gateway';
import { readArtifact, portableSpec } from './artifact_manifest';
import { SocketTransport } from './socket_transport';

const execute = promisify(execFile);
const docker = async (...args: string[]): Promise<string> => (await execute('docker', args, { maxBuffer: 8 * 1024 * 1024 })).stdout.trim();

export interface FaasOptions {
  readonly artifactPath: string;
  readonly expectedArtifactHash: string;
  readonly image: string;
  readonly memoryMiB: 128 | 256 | 512;
  readonly warm: boolean;
  readonly addedRttMs: 0 | 1 | 5 | 10;
  readonly callbackHost: string;
  readonly measurementPath: string;
}
interface RunRequest { scopeId: string; workflowRunId: string; spaceId: string }
interface InvocationResult {
  result: { status: string };
  metrics: { setupMs: number; executionMs: number; effectiveRttMs: number };
}

/** Local invocation orchestrator; no plugin or coordinator implementation enters the container. */
export class FaasBackend {
  private warmContainer?: { id: string; endpoint: string };
  private readonly owned = new Set<string>();
  private warmBusy = false;

  constructor(
    private readonly spec: RemoteWorkerSpec,
    private readonly coordinator: Map<string, object>,
    private readonly options: FaasOptions
  ) {}

  async ready(): Promise<void> {
    const manifest = readArtifact(this.options.artifactPath, this.options.expectedArtifactHash);
    if (JSON.stringify(manifest.spec) !== JSON.stringify(portableSpec(this.spec))) {
      throw new Error('Executor artifact graph does not match the registered Kibana graph');
    }
  }

  async run(request: RunRequest): Promise<{ status: string }> {
    if (this.options.warm && this.warmBusy) throw new Error('Warm diagnostic control allows one active invocation');
    if (this.options.warm) this.warmBusy = true;
    const invocationId = randomUUID();
    const token = randomUUID();
    const started = performance.now();
    const startedEpochMs = Date.now();
    const sockets = new Set<Socket>();
    const transports: SocketTransport[] = [];
    const sessions: RpcSession[] = [];
    const rpcCalls: RpcCallMeasurement[] = [];
    const gateway = new CoordinatorGateway(this.coordinator, (call) => {
      rpcCalls.push(call);
    });
    const server = createServer((socket) => {
      sockets.add(socket);
      socket.setTimeout(120_000, () => socket.destroy());
      const transport = new SocketTransport(socket, this.options.addedRttMs);
      transports.push(transport);
      void transport.receive().then((received) => {
        if (received !== token || sessions.length) { socket.destroy(); return; }
        sessions.push(new RpcSession(transport, gateway));
      }).catch(() => socket.destroy());
    });
    let container: { id: string; endpoint: string } | undefined;
    let response: InvocationResult | undefined;
    let failure: string | undefined;
    let launchMs = 0;
    let controlRequestBytes = 0;
    let controlResponseBytes = 0;
    let invocationHttpMs = 0;
    const stats: { at: number; value: string }[] = [];
    let sampler: NodeJS.Timeout | undefined;
    let samplePending: Promise<void> = Promise.resolve();
    let sampling = false;
    try {
      await this.ready();
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '0.0.0.0', resolve);
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing invocation callback address');
      const launchStart = performance.now();
      container = this.options.warm ? this.warmContainer : undefined;
      if (!container) {
        const id = `kbn-faas-${invocationId}`;
        this.owned.add(id);
        container = { id, endpoint: '' };
        const memory = `${this.options.memoryMiB}m`;
        await docker('run', '-d', '--name', id, '--label', 'kbn.workflows-faas=true',
          '--cpus=1', `--memory=${memory}`, `--memory-swap=${memory}`,
          ...(process.platform === 'linux' ? ['--add-host=host.docker.internal:host-gateway'] : []), '-p', '127.0.0.1::8080', this.options.image);
        const port = (await docker('port', id, '8080/tcp')).split(':').at(-1);
        if (!port) throw new Error('Docker did not publish the RIE port');
        container = { id, endpoint: `http://127.0.0.1:${port}` };
        // RIE has no readiness endpoint. Probe TCP only: never invoke the function as a health check.
        const { connect } = await import('node:net');
        const deadline = Date.now() + 30_000;
        while (true) {
          const available = await new Promise<boolean>((resolve) => {
            const probe = connect(Number(port), '127.0.0.1');
            probe.setTimeout(200);
            probe.once('connect', () => { probe.destroy(); resolve(true); });
            probe.once('error', () => { probe.destroy(); resolve(false); });
            probe.once('timeout', () => { probe.destroy(); resolve(false); });
          });
          if (available) break;
          if (Date.now() > deadline) throw new Error('RIE port readiness timed out');
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        if (this.options.warm) this.warmContainer = container;
      }
      launchMs = performance.now() - launchStart;
      const id = container.id;
      const sample = (): void => {
        if (sampling) return;
        sampling = true;
        samplePending = (async () => {
          try { stats.push({ at: Date.now(), value: await docker('stats', '--no-stream', '--format', '{{json .}}', id) }); }
          catch (error) { stats.push({ at: Date.now(), value: String(error) }); }
          finally { sampling = false; }
        })();
      };
      sample();
      sampler = setInterval(sample, 1000);
      const body = JSON.stringify({
        artifactHash: this.options.expectedArtifactHash, invocationEpochMs: Date.now(),
        host: this.options.callbackHost, port: address.port, token,
        addedRttMs: this.options.addedRttMs, request,
      });
      controlRequestBytes = Buffer.byteLength(body);
      const httpStart = performance.now();
      const reply = await fetch(`${container.endpoint}/2015-03-31/functions/function/invocations`, {
        method: 'POST', body, signal: AbortSignal.timeout(120_000),
      });
      const text = await reply.text();
      invocationHttpMs = performance.now() - httpStart;
      controlResponseBytes = Buffer.byteLength(text);
      if (!reply.ok || reply.headers.get('lambda-runtime-function-error-type')) throw new Error(`RIE invocation failed: ${text}`);
      response = JSON.parse(text) as InvocationResult;
      if (!response.result) throw new Error(`Function error: ${text}`);
      return response.result;
    } catch (error) {
      failure = String(error);
      throw error;
    } finally {
      if (sampler) clearInterval(sampler);
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await samplePending;
      let inspection = '';
      let logs = '';
      if (container) {
        inspection = await docker('inspect', container.id).catch(String);
        logs = await execute('docker', ['logs', container.id], { maxBuffer: 8 * 1024 * 1024 })
          .then(({ stdout, stderr }) => stdout + stderr).catch(String);
      }
      // A failed warm invocation is discarded, not retried. Side effects may already exist.
      let containerRemoved = false;
      let containerReleasedAtEpochMs: number | undefined;
      let cleanupFailure: string | undefined;
      if (container && (!this.options.warm || failure)) {
        try {
          await docker('rm', '-f', container.id);
          this.owned.delete(container.id);
          containerRemoved = true;
          containerReleasedAtEpochMs = Date.now();
        } catch (error) {
          cleanupFailure = `Failed to release invocation container ${container.id}: ${String(error)}`;
        }
        if (this.warmContainer?.id === container.id) this.warmContainer = undefined;
      }
      this.warmBusy = false;
      appendFileSync(this.options.measurementPath, `${JSON.stringify({
        containerId: container?.id, containerRemoved, containerReleasedAtEpochMs,
        invocationId, startedEpochMs, workflowRunId: request.workflowRunId, at: new Date().toISOString(),
        condition: this.options.memoryMiB === 128 ? 'primary-128MiB' : `diagnostic-${this.options.memoryMiB}MiB`,
        backend: this.options.warm ? 'warm-faas-control' : 'fresh-faas',
        artifactHash: this.options.expectedArtifactHash, image: this.options.image,
        memoryMiB: this.options.memoryMiB, cpuQuota: 1, swap: false, addedRttMs: this.options.addedRttMs,
        launchMs, invocationHttpMs, hostTotalMs: performance.now() - started,
        controlRequestBytes, controlResponseBytes, response, failure: failure ?? cleanupFailure, cleanupFailure,
        traffic: transports.map((transport) => transport.traffic),
        sessionSetup: { authBytes: Buffer.byteLength(token) + 1, ...gateway.setupCalls },
        rpcCalls, stats, inspection, logs,
      })}\n`);
      if (cleanupFailure) throw new Error(cleanupFailure);
    }
  }

  async stop(): Promise<void> {
    await Promise.all([...this.owned].map((id) => docker('rm', '-f', id)));
    this.owned.clear();
    this.warmContainer = undefined;
  }
}
