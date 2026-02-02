/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'util';
import * as crypto from 'crypto';
import { ReadableStream, WritableStream, TransformStream } from 'stream/web';
import { Blob } from 'buffer';

/**
 * Polyfills for Vitest test environment.
 * These mirror the polyfills used in the Jest setup.
 */

// Polyfill for setImmediate (used by some libraries)
if (typeof globalThis.setImmediate === 'undefined') {
  // @ts-expect-error - polyfill
  globalThis.setImmediate = (fn: (...args: any[]) => void, ...args: any[]) => {
    return setTimeout(fn, 0, ...args);
  };
}

if (typeof globalThis.clearImmediate === 'undefined') {
  // @ts-expect-error - polyfill
  globalThis.clearImmediate = (id: ReturnType<typeof setTimeout>) => {
    clearTimeout(id);
  };
}

// TextEncoder/TextDecoder polyfill (usually available, but ensure it exists)
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = NodeTextEncoder;
  // @ts-expect-error - polyfill
  globalThis.TextDecoder = NodeTextDecoder;
}

// Crypto polyfill for Node.js environment
if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error - polyfill for older Node.js versions
  globalThis.crypto = crypto.webcrypto || {
    getRandomValues: (buffer: Uint8Array) => {
      return crypto.randomFillSync(buffer);
    },
    randomUUID: () => crypto.randomUUID(),
  };
}

// ReadableStream polyfill
if (typeof globalThis.ReadableStream === 'undefined') {
  // @ts-expect-error - polyfill
  globalThis.ReadableStream = ReadableStream;
  // @ts-expect-error - polyfill
  globalThis.WritableStream = WritableStream;
  // @ts-expect-error - polyfill
  globalThis.TransformStream = TransformStream;
}

// Blob polyfill
if (typeof globalThis.Blob === 'undefined') {
  // @ts-expect-error - polyfill
  globalThis.Blob = Blob;
}

// File polyfill (basic implementation)
if (typeof globalThis.File === 'undefined') {
  // @ts-expect-error - polyfill
  globalThis.File = class File extends Blob {
    name: string;
    lastModified: number;

    constructor(
      chunks: BlobPart[],
      name: string,
      options?: { type?: string; lastModified?: number }
    ) {
      // Cast to any to handle Node.js vs browser Blob type differences
      super(chunks as any, { type: options?.type });
      this.name = name;
      this.lastModified = options?.lastModified ?? Date.now();
    }
  };
}

export {};
