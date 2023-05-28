/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BPromise } from '../lang';
import { warn } from '../log';
import { Event, pubsub } from '../pubsub';
import { runTillDone } from './runner';
import { summary } from './state';

let cancellable: {
  cancel: () => void;
} | null = null;

function onRunCancelled(reason: string) {
  warn(`Run cancelled: %s. Waiting for uploads to complete and stopping execution...`, reason);
  cancellable?.cancel();
}
export async function runTillDoneOrCancelled(...args: Parameters<typeof runTillDone>) {
  return new Promise((_resolve, _reject) => {
    cancellable = new BPromise((resolve, reject, onCancel) => {
      if (!onCancel) {
        _reject(new Error('BlueBird is misconfigured: onCancel is undefined'));
        return;
      }
      onCancel(() => _resolve(summary));
      runTillDone(...args).then(
        () => {
          resolve();
          _resolve(summary);
        },
        (error) => {
          reject();
          _reject(error);
        }
      );
    });

    pubsub.addListener(Event.RUN_CANCELLED, onRunCancelled);
  }).finally(() => {
    pubsub.removeListener(Event.RUN_CANCELLED, onRunCancelled);
  });
}
