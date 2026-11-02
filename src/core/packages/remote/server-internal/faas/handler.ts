/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { connect } from 'node:net';
import { performance } from 'node:perf_hooks';
import { RpcSession } from 'capnweb';
import { buildExecutor, type loadExport } from '../src/build_executor';
import { SocketTransport } from '../src/socket_transport';
import { readArtifact } from '../src/artifact_manifest';

interface Invocation {
  artifactHash: string;
  invocationEpochMs: number;
  host: string;
  port: number;
  token: string;
  addedRttMs: number;
  request: { scopeId: string; workflowRunId: string; spaceId: string };
}
interface Root {
  run(request: Invocation['request']): Promise<{ status: string }>;
}
interface Coordinator {
  getCapability(id: string): object;
  ping(): number;
}

/** Each handler call constructs a new graph and disposes its bidirectional RPC session. */
export function createHandler(resolveExport: typeof loadExport) {
  return async (event: Invocation) => {
    const handlerStart = performance.now();
    const cpuStart = process.cpuUsage();
    const manifest = readArtifact(process.env.LAMBDA_TASK_ROOT ?? __dirname, event.artifactHash);
    const socket = connect({ host: event.host, port: event.port });
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('error', reject); });
    socket.write(`${event.token}\n`);
    const transport = new SocketTransport(socket);
    const session = new RpcSession<Coordinator>(transport);
    const coordinator = session.getRemoteMain();
    try {
      const pingStart = performance.now();
      await coordinator.ping();
      const effectiveRttMs = performance.now() - pingStart;
      const values = new Map(manifest.spec.coordinatorTokenIds.map((id) => [id, coordinator.getCapability(id)]));
      const loaded: string[] = [];
      const executor = buildExecutor(manifest.spec, values, loaded, resolveExport) as Root;
      const setupTrafficExecutorEndpoint = { ...transport.traffic };
      const executionStart = performance.now();
      const result = await executor.run(event.request);
      return {
        result,
        metrics: {
          invocationToHandlerMs: performance.timeOrigin + handlerStart - event.invocationEpochMs,
          invocationToExecutionStartMs: performance.timeOrigin + executionStart - event.invocationEpochMs,
          handlerStartEpochMs: performance.timeOrigin + handlerStart,
          executionStartEpochMs: performance.timeOrigin + executionStart,
          setupTrafficExecutorEndpoint,
          setupMs: executionStart - handlerStart,
          executionMs: performance.now() - executionStart,
          effectiveRttMs, loaded, runtime: process.version,
          memory: process.memoryUsage(), cpu: process.cpuUsage(cpuStart),
        },
      };
    } finally {
      transport.abort();
    }
  };
}
