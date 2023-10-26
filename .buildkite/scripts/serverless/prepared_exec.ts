/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This file has a wrapper for exec, that stores answers for queries from a file, to be able to use it in tests.
 */

import {execSync, ExecSyncOptions} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const kibanaDir = execSync('git rev-parse --show-toplevel').toString().trim();

const callStorage = new Proxy<Record<string, Array<{ command: string; opts: any }>>>(
  {},
  {
    get: (target, prop: string) => {
      if (!target[prop]) {
        target[prop] = [];
      }
      return target[prop];
    },
  }
);

const loadFakeResponses = (() => {
  let responses: any;
  return () => {
    if (!responses) {
      const responsesFile = path.resolve(
        kibanaDir,
        '.buildkite/scripts/serverless/prepared_responses.json'
      );
      if (fs.existsSync(responsesFile)) {
        const responsesContent = fs.readFileSync(responsesFile).toString();
        responses = JSON.parse(responsesContent);
      } else {
        fs.writeFileSync(responsesFile, '{}');
        console.log(responsesFile, 'created');
        responses = {};
      }
    }

    return responses;
  };
})();

const mockExec = (id: string) => {
  console.warn("--- Using mock exec, don't use this on CI. ---");
  const calls = callStorage[id];

  const mockExecInstance = (command: string, opts: ExecSyncOptions = {}) => {
    const responses = loadFakeResponses();
    calls.push({ command, opts });

    if (responses[command]) {
      return responses[command];
    } else {
      console.warn(`No response for command: ${command}`);
      return exec(command, opts);
    }
  };

  mockExecInstance.id = id;
  mockExecInstance.calls = calls;

  return mockExecInstance;
};

const exec = (command: string, opts: any = {}) =>
  execSync(command, { encoding: 'utf-8', cwd: kibanaDir, ...opts })
    .toString()
    .trim();

const randomId = () => (Math.random() * 10e15).toString(36);

const getExec = (fake = false, id: string = randomId()) => {
  return fake ? mockExec(id) : exec;
};

export { getExec, callStorage };
