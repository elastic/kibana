/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import stripAnsi from 'strip-ansi';
import type { Supervisor } from '../supervisor';

const DEFAULT_LOG_LINES = 100;
const MAX_LOG_LINES = 2000;
// Enough for MAX_LOG_LINES of Kibana's output, without reading a log of hundreds of megabytes.
const LOG_TAIL_BYTES = 1024 * 1024;
const DEFAULT_WAIT_SECONDS = 600;
const MAX_WAIT_SECONDS = 3600;
// The MCP server cannot stop or restart itself while answering.
const SELF = 'mcp';

const LIMIT = { maxLength: 200 } as const;
const processProperty = {
  process: { type: 'string', description: 'The process id, as list_processes shows it', ...LIMIT },
};

export const TOOLS: readonly Tool[] = [
  {
    name: 'list_processes',
    description:
      'Lists Elasticsearch, Kibana and the dev tools with their state, URL, error, log file and, for tools, the arguments they start with.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'read_logs',
    description: `Reads the latest lines of a process's output, oldest first, optionally only the lines containing filter (case-insensitive).`,
    inputSchema: {
      type: 'object',
      required: ['process'],
      properties: {
        ...processProperty,
        lines: {
          type: 'integer',
          minimum: 1,
          maximum: MAX_LOG_LINES,
          description: `How many lines (default ${DEFAULT_LOG_LINES})`,
        },
        filter: { type: 'string', description: 'Only lines containing this text', ...LIMIT },
      },
    },
    annotations: { readOnlyHint: true },
  },
  ...(['start', 'restart'] as const).map(
    (verb): Tool => ({
      name: `${verb}_process`,
      description: `${
        verb === 'start' ? 'Starts' : 'Restarts'
      } a process once the processes it depends on are ready. For a tool, args replaces the arguments it starts with, e.g. "logs_and_metrics --live" for synthtrace.`,
      inputSchema: {
        type: 'object',
        required: ['process'],
        properties: {
          ...processProperty,
          args: {
            type: 'string',
            description: 'Tools only: the arguments, as typed in a shell',
            maxLength: 2000,
          },
        },
      },
    })
  ),
  {
    name: 'stop_process',
    description: 'Stops a process and everything it started.',
    inputSchema: { type: 'object', required: ['process'], properties: processProperty },
    annotations: { destructiveHint: true },
  },
  {
    name: 'wait_until_ready',
    description:
      'Waits until a process is ready, and fails when it ends or fails first, or after timeoutSeconds.',
    inputSchema: {
      type: 'object',
      required: ['process'],
      properties: {
        ...processProperty,
        timeoutSeconds: {
          type: 'integer',
          minimum: 1,
          maximum: MAX_WAIT_SECONDS,
          description: `Default ${DEFAULT_WAIT_SECONDS}`,
        },
      },
    },
    annotations: { readOnlyHint: true },
  },
];

type Arguments = Readonly<Record<string, unknown>>;

const text = (value: string | object, isError = false): CallToolResult => ({
  content: [
    { type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) },
  ],
  isError,
});

const readString = (args: Arguments, key: string): string | undefined => {
  const value = args[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string`);
  }
  return value;
};

const readInteger = (args: Arguments, key: string, fallback: number, max: number): number => {
  const value = args[key] ?? fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`${key} must be a whole number from 1 to ${max}`);
  }
  return value;
};

const getProcessId = (supervisor: Supervisor, args: Arguments): string => {
  const id = readString(args, 'process');
  const ids = supervisor.getStatus().processes.map((status) => status.id);
  if (!id || !ids.includes(id)) {
    throw new Error(`process must be one of ${ids.join(', ')}`);
  }
  return id;
};

const describeProcesses = (supervisor: Supervisor) =>
  supervisor.getStatus().processes.map(({ id, state, url, pid, error, logFile, readyAt }) => {
    const tool = supervisor.getTool(id);
    return {
      id,
      state,
      ...(url ? { url } : {}),
      ...(pid ? { pid } : {}),
      ...(error ? { error } : {}),
      ...(readyAt ? { readyAt } : {}),
      logFile,
      ...(tool ? { tool: { description: tool.description, args: tool.getArgs() } } : {}),
    };
  });

/** The last `lines` lines of a log file, reading only its end. */
const readLogTail = async (file: string, lines: number, filter?: string): Promise<string[]> => {
  let handle: fs.FileHandle;
  try {
    handle = await fs.open(file, 'r');
  } catch {
    return [];
  }
  try {
    const { size } = await handle.stat();
    const length = Math.min(size, LOG_TAIL_BYTES);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, size - length);
    const all = stripAnsi(buffer.toString('utf8')).split('\n');
    // The first line may be cut off when only the end of the file was read.
    const complete = length < size ? all.slice(1) : all;
    const needle = filter?.toLowerCase();
    return complete
      .filter((line) => line !== '' && (!needle || line.toLowerCase().includes(needle)))
      .slice(-lines);
  } finally {
    await handle.close();
  }
};

const withTimeout = <T>(promise: Promise<T>, seconds: number, message: string): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), seconds * 1000);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const runTool = async (
  supervisor: Supervisor,
  name: string,
  args: Arguments
): Promise<CallToolResult> => {
  switch (name) {
    case 'list_processes':
      return text(describeProcesses(supervisor));
    case 'read_logs': {
      const id = getProcessId(supervisor, args);
      const lines = readInteger(args, 'lines', DEFAULT_LOG_LINES, MAX_LOG_LINES);
      const status = supervisor.getStatus().processes.find((process) => process.id === id);
      const tail = status
        ? await readLogTail(status.logFile, lines, readString(args, 'filter'))
        : [];
      return text(tail.length > 0 ? tail.join('\n') : `${id} has no matching output`);
    }
    case 'start_process':
    case 'restart_process': {
      const id = getProcessId(supervisor, args);
      if (name === 'restart_process' && id === SELF) {
        throw new Error('The MCP server cannot restart itself; restart it from the TUI');
      }
      const toolArgs = readString(args, 'args');
      if (toolArgs !== undefined) {
        const tool = supervisor.getTool(id);
        if (!tool) {
          throw new Error(`${id} is not a tool, so it takes no args`);
        }
        tool.setArgs(toolArgs);
      }
      await (name === 'start_process' ? supervisor.start(id) : supervisor.restart(id));
      return text(describeProcesses(supervisor).find((process) => process.id === id) ?? {});
    }
    case 'stop_process': {
      const id = getProcessId(supervisor, args);
      if (id === SELF) {
        throw new Error('The MCP server cannot stop itself; stop it from the TUI');
      }
      await supervisor.stop(id);
      return text(describeProcesses(supervisor).find((process) => process.id === id) ?? {});
    }
    case 'wait_until_ready': {
      const id = getProcessId(supervisor, args);
      const seconds = readInteger(args, 'timeoutSeconds', DEFAULT_WAIT_SECONDS, MAX_WAIT_SECONDS);
      await withTimeout(supervisor.whenReady(id), seconds, `${id} is not ready after ${seconds}s`);
      return text(`${id} is ready`);
    }
    default:
      throw new Error(`Unknown tool ${name}`);
  }
};

/** Runs an MCP tool; errors are returned to the agent as tool errors, so it can correct its call. */
export const callTool = async (
  supervisor: Supervisor,
  name: string,
  args: Arguments
): Promise<CallToolResult> => {
  try {
    return await runTool(supervisor, name, args);
  } catch (error) {
    return text(error.message, true);
  }
};
