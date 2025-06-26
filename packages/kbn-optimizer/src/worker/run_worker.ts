/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inspect } from 'util';

import * as Rx from 'rxjs';
import { take, mergeMap } from 'rxjs';

import {
  parseBundles,
  parseWorkerConfig,
  WorkerMsg,
  isWorkerMsg,
  WorkerMsgs,
  BundleRemotes,
} from '../common';

import { runCompilers } from './run_compilers';

/**
 **
 **
 ** Entry file for optimizer workers, this hooks into the process, handles
 ** sending messages to the parent, makes sure the worker exits properly
 ** and triggers all the compilers by calling runCompilers()
 **
 **
 **/

const workerMsgs = new WorkerMsgs();

if (!process.send) {
  throw new Error('worker process was not started with an IPC channel');
}

const send = (msg: WorkerMsg) => {
  if (!process.send) {
    // parent is gone
    process.exit(0);
  } else {
    process.send(msg);
  }
};

/**
 * set the exitCode and wait for the process to exit, if it
 * doesn't exit naturally do so forcibly and fail.
 */
const exit = (code: number) => {
  process.exitCode = code;
  setTimeout(() => {
    send(
      workerMsgs.error(
        new Error('process did not automatically exit within 5 seconds, forcing exit')
      )
    );
    process.exit(1);
  }, 5000).unref();
};

// check for connected parent on an unref'd timer rather than listening
// to "disconnect" since that listner prevents the process from exiting
setInterval(() => {
  if (!process.connected) {
    // parent is gone
    process.exit(0);
  }
}, 1000).unref();

function assertInitMsg(msg: unknown): asserts msg is { args: string[] } {
  if (typeof msg !== 'object' || !msg) {
    throw new Error(`expected init message to be an object: ${inspect(msg)}`);
  }

  const { args } = msg as Record<string, unknown>;
  if (!args || !Array.isArray(args) || !args.every((a) => typeof a === 'string')) {
    throw new Error(
      `expected init message to have an 'args' property that's an array of strings: ${inspect(msg)}`
    );
  }
}

Rx.defer(() => {
  process.send!('init');

  return Rx.fromEvent<[unknown]>(process as any, 'message').pipe(
    take(1),
    mergeMap(([msg]) => {
      assertInitMsg(msg);
      process.send!('ready');

      const workerConfig = parseWorkerConfig(msg.args[0]);
      const bundles = parseBundles(msg.args[1]);
      const bundleRefs = BundleRemotes.parseSpec(msg.args[2]);

      // set BROWSERSLIST_ENV so that style/babel loaders see it before running compilers
      process.env.BROWSERSLIST_ENV = workerConfig.browserslistEnv;

      return runCompilers(workerConfig, bundles, bundleRefs);
    })
  );
}).subscribe(
  (msg) => {
    send(msg);
  },
  (error) => {
    if (isWorkerMsg(error)) {
      send(error);
    } else {
      send(workerMsgs.error(error));
    }

    exit(1);
  },
  () => {
    exit(0);
  }
);
