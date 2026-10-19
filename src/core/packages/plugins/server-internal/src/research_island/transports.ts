/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * RESEARCH ONLY (Track 2 islands) — transports for the island RPC.
 *
 * thread:  async messages over the Worker port; island→main blocking calls post on the same
 *          port and wait on a SharedArrayBuffer word (Atomics.wait); main replies on a
 *          dedicated MessagePort and bumps the word (Atomics.notify). Main never waits.
 * process: main→child async over the IPC channel (advanced serialization); every child→main
 *          message goes through FIFO A written with blocking fs.writeSync (keeps ordering and
 *          guarantees the bytes left before the child blocks); main replies to blocking calls on
 *          FIFO B, read by the child with blocking fs.readSync. Main uses only async fs streams.
 */

import fs from 'fs';
import { serialize, deserialize } from 'v8';
import type { MessagePort, Worker } from 'worker_threads';
import { receiveMessageOnPort } from 'worker_threads';
import type { ChildProcess } from 'child_process';
import type { Msg, Transport } from './wire';

// ------------------------------------------------------------------ thread

export const createThreadMainTransport = (
  worker: Worker,
  flag: Int32Array,
  syncReplyPort: MessagePort
): Transport => ({
  post: (msg) => worker.postMessage(msg),
  onMessage: (cb) => worker.on('message', cb),
  replySync: (msg) => {
    syncReplyPort.postMessage(msg);
    Atomics.add(flag, 0, 1);
    Atomics.notify(flag, 0);
  },
});

export const createThreadIslandTransport = (
  port: MessagePort,
  flag: Int32Array,
  syncReplyPort: MessagePort
): Transport => ({
  post: (msg) => port.postMessage(msg),
  onMessage: (cb) => port.on('message', cb),
  callSync: (msg) => {
    let seen = Atomics.load(flag, 0);
    port.postMessage(msg);
    for (;;) {
      const received = receiveMessageOnPort(syncReplyPort);
      if (received) return received.message as Msg;
      Atomics.wait(flag, 0, seen, 60_000);
      seen = Atomics.load(flag, 0);
    }
  },
});

// ------------------------------------------------------------------ process

const frame = (msg: Msg): Buffer => {
  const body = serialize(msg);
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
};

/** Incremental length-prefixed frame parser. */
const createFrameReader = (onFrame: (msg: Msg) => void) => {
  let buf = Buffer.alloc(0);
  return (chunk: Buffer) => {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (buf.length >= 4) {
      const len = buf.readUInt32LE(0);
      if (buf.length < 4 + len) break;
      const body = buf.subarray(4, 4 + len);
      buf = buf.subarray(4 + len);
      onFrame(deserialize(body) as Msg);
    }
  };
};

export const createProcessMainTransport = (
  child: ChildProcess,
  fifoFromChild: string,
  fifoToChild: string
): Transport => {
  const listeners: Array<(msg: Msg) => void> = [];
  const dispatch = (msg: Msg) => listeners.forEach((cb) => cb(msg));
  const reader = fs.createReadStream(fifoFromChild, { highWaterMark: 1 << 20 });
  reader.on('data', createFrameReader(dispatch) as (chunk: string | Buffer) => void);
  const writer = fs.createWriteStream(fifoToChild);
  return {
    post: (msg) => child.send(msg as unknown as object),
    onMessage: (cb) => listeners.push(cb),
    replySync: (msg) => {
      writer.write(frame(msg));
    },
  };
};

export const createProcessIslandTransport = (
  fifoToMain: string,
  fifoFromMain: string
): Transport => {
  const out = fs.openSync(fifoToMain, 'w');
  const inp = fs.openSync(fifoFromMain, 'r');
  const header = Buffer.alloc(4);
  const readExactly = (target: Buffer) => {
    let off = 0;
    while (off < target.length) {
      const n = fs.readSync(inp, target, off, target.length - off, null);
      if (n === 0) throw new Error('island sync channel closed');
      off += n;
    }
  };
  const writeAll = (data: Buffer) => {
    let off = 0;
    while (off < data.length) off += fs.writeSync(out, data, off, data.length - off);
  };
  return {
    post: (msg) => writeAll(frame(msg)),
    onMessage: (cb) => process.on('message', (m) => cb(m as Msg)),
    callSync: (msg) => {
      writeAll(frame(msg));
      readExactly(header);
      const body = Buffer.alloc(header.readUInt32LE(0));
      readExactly(body);
      return deserialize(body) as Msg;
    },
  };
};
