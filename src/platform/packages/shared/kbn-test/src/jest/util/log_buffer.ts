/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { promises as fs, createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

export type LogBufferKind = 'memory' | 'file';

export interface LogBuffer {
  readonly kind: LogBufferKind;
  append(chunk: Buffer): void;
  finalize(): Promise<void>;
  writeToLog(): Promise<void>;
  dispose(): Promise<void>;
}

const MAX_MEMORY_OUTPUT_BYTES = 100 * 1024 * 1024;

export function createLogBuffer(params: {
  kind: LogBufferKind;
  outputFilePath: string;
}): LogBuffer {
  if (params.kind === 'file') {
    return createFileLogBuffer(params.outputFilePath);
  }
  return createMemoryLogBuffer();
}

function createMemoryLogBuffer(): LogBuffer {
  let buffer = '';
  let bytes = 0;
  let truncated = false;

  return {
    kind: 'memory',
    append(chunk) {
      if (truncated) {
        return;
      }
      bytes += chunk.length;
      if (bytes > MAX_MEMORY_OUTPUT_BYTES) {
        truncated = true;
        buffer += '\n… output truncated (memory log buffer limit)\n';
        return;
      }
      buffer += chunk.toString();
    },
    async finalize() {},
    async writeToLog() {
      process.stdout.write(buffer);
      process.stdout.write('\n');
    },
    async dispose() {},
  };
}

function createFileLogBuffer(outputFilePath: string): LogBuffer {
  const stream = createWriteStream(outputFilePath);
  let finalized = false;

  return {
    kind: 'file',
    append(chunk) {
      stream.write(chunk);
    },
    async finalize() {
      if (finalized) {
        return;
      }
      finalized = true;
      stream.end();
      await new Promise<void>((resolve) => {
        if ((stream as NodeJS.WritableStream & { closed?: boolean }).closed) {
          return resolve();
        }
        stream.once('finish', () => resolve());
        stream.once('error', () => resolve());
      });
    },
    async writeToLog() {
      try {
        await pipeline(createReadStream(outputFilePath), process.stdout, { end: false });
        process.stdout.write('\n');
      } catch {
        // Best-effort flush; if the file is missing or unreadable, fall through.
      }
    },
    async dispose() {
      try {
        await fs.unlink(outputFilePath);
      } catch {
        // Best-effort cleanup.
      }
    },
  };
}
