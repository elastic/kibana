/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This file has a wrapper for exec, that stores answers for queries from a file, to be able to use it in tests.
 */

import { execSync, ExecSyncOptions } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getKibanaDir } from '#pipeline-utils';

const PREPARED_RESPONSES_PATH =
  '.buildkite/scripts/serverless/create_deploy_tag/prepared_responses.json';

/**
 * This module allows for a stand-in for execSync that stores calls, and responds from a file of recorded responses.
 * Most of the components in this module are lazy, so that they are only initialized if needed.
 * @param fake - if set to true, it will use the fake, prepared exec, if false, it will use child_process.execSync
 * @param id - an optional ID, used to distinguish between different instances of exec.
 */
const getExec = (fake = false, id: string = randomId()) => {
  return fake ? makeMockExec(id) : exec;
};

/**
 * Lazy getter for a storage for calls to the mock exec.
 */
const getCallStorage: () => Record<string, Array<{ command: string; opts: any }>> = (() => {
  let callStorage: Record<string, Array<{ command: string; opts: any }>> | null = null;

  return () => {
    if (!callStorage) {
      callStorage = new Proxy<Record<string, Array<{ command: string; opts: any }>>>(
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
    }
    return callStorage;
  };
})();

/**
 * Lazy getter for the responses file.
 */
const loadFakeResponses = (() => {
  let responses: any;
  return () => {
    if (!responses) {
      const responsesFile = path.resolve(getKibanaDir(), PREPARED_RESPONSES_PATH);
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

const makeMockExec = (id: string) => {
  if (process.env?.CI?.match(/(1|true)/i)) {
    throw new Error(`Mock exec is not supported in CI - your commands won't be executed.`);
  }

  const callStorage = getCallStorage();
  const calls = callStorage[id];

  const mockExecInstance = (command: string, opts: ExecSyncOptions = {}): string | null => {
    const responses = loadFakeResponses();
    calls.push({ command, opts });

    if (typeof responses[command] !== 'undefined') {
      return responses[command];
    } else {
      console.warn(`No response for command: ${command}`);
      responses[command] = '<missing>';
      fs.writeFileSync(
        path.resolve(getKibanaDir(), PREPARED_RESPONSES_PATH),
        JSON.stringify(responses, null, 2)
      );
      return exec(command, opts);
    }
  };

  mockExecInstance.id = id;
  mockExecInstance.calls = calls;

  return mockExecInstance;
};

const exec = (command: string, opts: any = {}) => {
  const result = execSync(command, { encoding: 'utf-8', cwd: getKibanaDir(), ...opts });
  if (result) {
    return result.toString().trim();
  } else {
    return null;
  }
};

const randomId = () => (Math.random() * 10e15).toString(36);

export { getExec, getCallStorage };
