/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface FtrTask {
  config: string;
  queue: string;
  expectedDurationMin: number;
}

export interface FtrPlan {
  tasks: FtrTask[];
  workerCount: number;
  retryCount: number;
}

interface TaskState extends FtrTask {
  status: 'pending' | 'leased' | 'success' | 'failed';
  leaseId?: string;
  workerId?: string;
  expiresAt?: number;
  attempts: number;
}

const send = (response: ServerResponse, status: number, value: object): void => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
};

const readBody = async (request: IncomingMessage): Promise<Record<string, string | number>> => {
  let body = '';
  for await (const chunk of request) {
    body += String(chunk);
    if (body.length > 4096) throw new Error('Request body too large');
  }
  const value: object = JSON.parse(body || '{}');
  if (Array.isArray(value) || value === null || typeof value !== 'object') {
    throw new Error('Invalid request body');
  }
  return value as Record<string, string | number>;
};

/** In-memory FTR queue, scoped to one Buildkite build. */
export const createFtrScheduler = (
  plan: FtrPlan,
  token: string,
  leaseMs = 120_000,
  now = Date.now
) => {
  const tasks: TaskState[] = plan.tasks.map((task) => ({
    ...task,
    status: 'pending',
    attempts: 0,
  }));
  const completedWorkers = new Set<string>();

  const expireLeases = (): void => {
    const currentTime = now();
    for (const task of tasks) {
      if (task.status === 'leased' && (task.expiresAt ?? 0) <= currentTime) {
        console.log(`Lease expired, requeuing ${task.config}`);
        task.status = 'pending';
        task.leaseId = undefined;
        task.workerId = undefined;
        task.expiresAt = undefined;
      }
    }
  };

  const server = createServer(async (request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) {
      send(response, 401, { error: 'Unauthorized' });
      return;
    }

    try {
      if (request.method === 'GET' && request.url === '/health') {
        send(response, 200, { ok: true });
        return;
      }

      if (request.method !== 'POST') {
        send(response, 404, { error: 'Unknown route' });
        return;
      }

      const body = await readBody(request);
      if (request.url === '/claim') {
        const { queue, workerId } = body;
        if (typeof queue !== 'string' || typeof workerId !== 'string') {
          send(response, 400, { error: 'queue and workerId are required' });
          return;
        }
        expireLeases();
        const task = tasks.find((item) => item.queue === queue && item.status === 'pending');
        if (task) {
          task.status = 'leased';
          task.leaseId = randomUUID();
          task.workerId = workerId;
          task.expiresAt = now() + leaseMs;
          console.log(`Claimed ${task.config} for ${workerId}`);
          send(response, 200, { config: task.config, leaseId: task.leaseId });
          return;
        }
        const active = tasks.some((item) => item.queue === queue && item.status === 'leased');
        send(response, 200, active ? { wait: true } : { done: true });
        return;
      }

      if (request.url === '/heartbeat' || request.url === '/complete') {
        const { leaseId } = body;
        const task = tasks.find((item) => item.status === 'leased' && item.leaseId === leaseId);
        if (!task || (task.expiresAt ?? 0) <= now()) {
          send(response, 409, { error: 'Lease expired or unknown' });
          return;
        }
        if (request.url === '/heartbeat') {
          task.expiresAt = now() + leaseMs;
          send(response, 200, { ok: true });
          return;
        }
        task.attempts++;
        task.status =
          body.exitCode === 0 ? 'success' : task.attempts <= plan.retryCount ? 'pending' : 'failed';
        console.log(`Completed ${task.config}: ${task.status} (attempt ${task.attempts})`);
        send(response, 200, { ok: true });
        return;
      }

      if (request.url === '/done' && typeof body.workerId === 'string') {
        completedWorkers.add(body.workerId);
        send(response, 200, { ok: true });
        return;
      }

      send(response, 404, { error: 'Unknown route' });
    } catch (error) {
      send(response, 400, { error: String(error) });
    }
  });

  return {
    server,
    summary: () => ({
      finished:
        completedWorkers.size >= plan.workerCount &&
        tasks.every(({ status }) => status === 'success' || status === 'failed'),
      failures: tasks.filter(({ status }) => status === 'failed').map(({ config }) => config),
      completedWorkers: completedWorkers.size,
    }),
  };
};
