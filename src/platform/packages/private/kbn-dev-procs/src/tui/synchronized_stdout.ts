/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Synchronized output (DEC private mode 2026): the terminal holds back drawing between these markers.
const BEGIN_SYNCHRONIZED_UPDATE = '\u001b[?2026h';
const END_SYNCHRONIZED_UPDATE = '\u001b[?2026l';

type WriteCallback = (error?: Error | null) => void;

/**
 * Wraps every string written to `stream` in a synchronized update. Ink writes each frame as one string that first
 * erases the previous frame, so without this a terminal can show the erased screen for a moment: a flash on every
 * update. Terminals without synchronized output ignore the markers.
 */
export const createSynchronizedStdout = <T extends NodeJS.WritableStream>(stream: T): T =>
  new Proxy(stream, {
    get: (target, property) => {
      if (property === 'write') {
        return (
          chunk: string | Uint8Array,
          encoding?: BufferEncoding | WriteCallback,
          callback?: WriteCallback
        ): boolean => {
          const onWritten = typeof encoding === 'function' ? encoding : callback;
          if (typeof chunk !== 'string') {
            return target.write(chunk, onWritten);
          }
          const frame = `${BEGIN_SYNCHRONIZED_UPDATE}${chunk}${END_SYNCHRONIZED_UPDATE}`;
          return typeof encoding === 'function' || encoding === undefined
            ? target.write(frame, onWritten)
            : target.write(frame, encoding, onWritten);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
