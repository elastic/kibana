/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Debug from 'debug';
const debug = Debug('currents:capture');

const _write = process.stdout.write;
const _log = process.log;

export const restore = function () {
  // restore to the originals
  process.stdout.write = _write;
  process.log = _log;
};

const logs: Record<string, string[]> = {};

const stdout = function () {
  debug('capturing stdout');
  let logs: string[] = [];

  // lazily backup write to enable injection
  const { write } = process.stdout;
  const { log } = process;

  // electron adds a new process.log
  // method for windows instead of process.stdout.write
  // https://github.com/cypress-io/cypress/issues/977
  if (log) {
    process.log = function (str: string) {
      logs.push(str);

      // @ts-ignore
      // eslint-disable-next-line prefer-rest-params
      return log.apply(this, arguments);
    };
  }

  process.stdout.write = function (str: string) {
    logs.push(str);

    // @ts-ignore
    // eslint-disable-next-line prefer-rest-params
    return write.apply(this, arguments);
  };

  return {
    toString() {
      return logs.join('');
    },
    data: logs,
    restore,
    reset: () => {
      debug('resetting captured stdout');
      logs = [];
    },
  };
};

let initialOutput: string = '';
let capturedOutput: null | ReturnType<typeof stdout> = null;

export const initCapture = () => (capturedOutput = stdout());

export const cutInitialOutput = () => {
  if (!capturedOutput) throw new Error('capturedOutput is null');
  initialOutput = capturedOutput.toString();
  capturedOutput.reset();
};
export const resetCapture = () => {
  if (!capturedOutput) throw new Error('capturedOutput is null');
  capturedOutput.reset();
};

export const getCapturedOutput = () => {
  if (!capturedOutput) throw new Error('capturedOutput is null');
  return capturedOutput.toString();
};
export const getInitialOutput = () => initialOutput;
