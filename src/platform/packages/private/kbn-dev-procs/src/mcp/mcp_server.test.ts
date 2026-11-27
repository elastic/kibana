/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Supervisor } from '../supervisor';
import type { LogLine } from '../types';
import { createMcpService, isLocalRequest, parseMcpPort } from './mcp_server';

describe('parseMcpPort', () => {
  it('reads --port, with its value separate or inline', () => {
    expect(parseMcpPort('')).toBe(5690);
    expect(parseMcpPort('--port 5691')).toBe(5691);
    expect(parseMcpPort('--port=0')).toBe(0);
  });

  it('rejects anything else', () => {
    expect(() => parseMcpPort('--host 0.0.0.0')).toThrow('Unknown argument --host');
    expect(() => parseMcpPort('--port')).toThrow('--port must be a port number');
    expect(() => parseMcpPort('--port 70000')).toThrow('--port must be a port number');
  });
});

describe('isLocalRequest', () => {
  it('accepts local hosts without an origin, or with a local one', () => {
    expect(isLocalRequest({ host: '127.0.0.1:5690' }, 5690)).toBe(true);
    expect(isLocalRequest({ host: 'localhost:5690', origin: 'http://localhost:5690' }, 5690)).toBe(
      true
    );
  });

  it('rejects web pages and rebound hostnames', () => {
    expect(isLocalRequest({ host: '127.0.0.1:5690', origin: 'https://evil.example' }, 5690)).toBe(
      false
    );
    expect(isLocalRequest({ host: 'evil.example:5690' }, 5690)).toBe(false);
    expect(isLocalRequest({}, 5690)).toBe(false);
  });
});

describe('MCP server', () => {
  let logDir: string;
  let supervisor: Supervisor;
  let client: Client;
  let url: string;

  const call = async (name: string, args: Record<string, string | number> = {}) =>
    (await client.callTool({ name, arguments: args })) as CallToolResult;
  const textOf = (result: CallToolResult) =>
    result.content.map((part) => (part.type === 'text' ? part.text : '')).join('');

  beforeAll(async () => {
    logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbn-dev-procs-mcp-'));
    const mcp = createMcpService({ getSupervisor: () => supervisor });
    mcp.tool?.setArgs('--port 0');
    supervisor = new Supervisor({
      logDir,
      startTools: ['mcp'],
      definitions: [
        {
          id: 'es',
          command: process.execPath,
          // Built from parts, so the command line in the log's start marker does not match the filter below.
          args: [
            '-e',
            "console.log('es started'); console.log('cluster' + ' ready'); setInterval(() => {}, 1000);",
          ],
          ready: { type: 'log', pattern: /cluster ready/ },
          stopTimeoutMs: 2000,
        },
        mcp,
      ],
    });
    const lines: LogLine[] = [];
    supervisor.onLine((line) => lines.push(line));
    await supervisor.startAll();
    await supervisor.whenReady('mcp');
    await supervisor.whenReady('es');
    const listening = lines.find(({ text }) => text.startsWith('MCP server listening at '));
    url = listening?.text.replace('MCP server listening at ', '') ?? '';
    client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  });

  afterAll(async () => {
    await client?.close();
    await supervisor.stopAll();
    fs.rmSync(logDir, { recursive: true, force: true });
  });

  it('lists its tools and the processes', async () => {
    const { tools } = await client.listTools();
    expect(tools.map(({ name }) => name)).toEqual([
      'list_processes',
      'read_logs',
      'start_process',
      'restart_process',
      'stop_process',
      'wait_until_ready',
    ]);
    const processes = JSON.parse(textOf(await call('list_processes')));
    expect(processes.map(({ id, state }: { id: string; state: string }) => [id, state])).toEqual([
      ['es', 'ready'],
      ['mcp', 'ready'],
    ]);
    expect(processes[1].tool.args).toBe('--port 0');
  });

  it('reads logs, filtered', async () => {
    expect(textOf(await call('read_logs', { process: 'es', filter: 'CLUSTER READY' }))).toBe(
      'cluster ready'
    );
  });

  it('restarts a process and waits until it is ready', async () => {
    await call('restart_process', { process: 'es' });
    expect(textOf(await call('wait_until_ready', { process: 'es', timeoutSeconds: 30 }))).toBe(
      'es is ready'
    );
  });

  it('explains what it cannot do as tool errors', async () => {
    const stopSelf = await call('stop_process', { process: 'mcp' });
    expect(stopSelf.isError).toBe(true);
    expect(textOf(stopSelf)).toBe('The MCP server cannot stop itself; stop it from the TUI');
    expect(textOf(await call('read_logs', { process: 'nope' }))).toBe(
      'process must be one of es, mcp'
    );
    expect(textOf(await call('start_process', { process: 'es', args: '--x' }))).toBe(
      'es is not a tool, so it takes no args'
    );
  });

  it('refuses requests from web pages', async () => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
      body: '{}',
    });
    expect(response.status).toBe(403);
  });
});
