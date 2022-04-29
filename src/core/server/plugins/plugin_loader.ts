/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import SynchronousWorker from 'synchronous-worker';
import { setImmediate } from 'timers/promises';

function bubbleError(err: Error) {
  console.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
      },
    },
    'error encounterated within the isolate plugin'
  );

  process.emit('uncaughtException', err);
}

type Nullable<Subj> = Subj | null;

export interface IsolateInstance<Module> {
  isolateModule: Module;
  isolateTeardown: () => Promise<void>;
}

export function requireIsolate<Module>(modulePath: string): IsolateInstance<Module> {
  // const isolate = new SynchronousWorker({
  //   sharedEventLoop: true,
  //   sharedMicrotaskQueue: true,
  // });

  // const req = isolate.creaeteRequire(modulePath);
  // let promise;
  // isolate.runInWorkerScope(() => {
  //   promise = req('vm').runInThisContext(`(async(req, pt) => {
  //     return req(pt)
  //   })`)(req, modulePath));
  // });

  // isolate.runLoopUntilPromiseResolved(promise);

  // let _require: Nullable<NodeJS.Require> = isolate.createRequire(modulePath);
  // isolate.process.on('uncaughtException', bubbleError)
  // isolate.globalThis.Error = Error
  // require plugin inside VM isolate
  const isolateModule = require(modulePath);
  // console.log('require.cache::', require.cache);

  // ready to be garbage collected
  // _require = null;

  return {
    isolateModule,
    isolateTeardown: async () => {
      console.log('tearing down!');
      // the immediate blocks are needed to ensure that the worker
      // has actually finished its work before closing
      await setImmediate();
      // await isolate.stop();
      // isolateModule.terminate();
      // await isolate.stop();
      await setImmediate();
    },
  };
}
