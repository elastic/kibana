/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import rimraf = require('rimraf');
import { ServerOptions } from '../server_options';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { JavaLauncher } from './java_launcher';
import { LanguageServerStatus } from './language_server_launcher';

// @ts-ignore
const options: ServerOptions = {
  workspacePath: '/tmp/test/workspace',
  jdtWorkspacePath: '/tmp/test/jdt',
};

beforeAll(async () => {
  if (!fs.existsSync(options.workspacePath)) {
    fs.mkdirSync(options.workspacePath);
    fs.mkdirSync(options.jdtWorkspacePath);
  }
});

afterAll(() => {
  return new Promise(resolve => {
    rimraf(options.workspacePath, () => {
      rimraf(options.jdtWorkspacePath, resolve);
    });
  });
});

function delay(seconds: number) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), seconds * 1000);
  });
}

test('java language server could be shutdown', async () => {
  // @ts-ignore
  const javaLauncher = new JavaLauncher('localhost', false, options, new ConsoleLoggerFactory());
  const proxy = await javaLauncher.launch(true, 1);
  await delay(2);
  expect(javaLauncher.status()).toBe(LanguageServerStatus.RUNNING);
  await proxy.exit();
  await delay(2);
  expect(javaLauncher.status()).toBe(LanguageServerStatus.NOT_RUNNING);
});
