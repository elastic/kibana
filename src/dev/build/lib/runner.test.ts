/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ToolingLog,
  ToolingLogCollectingWriter,
  createStripAnsiSerializer,
  createRecursiveSerializer,
} from '@kbn/dev-utils';
import { Config } from './config';
import { createRunner } from './runner';
import { Build } from './build';
import { isErrorLogged, markErrorLogged } from './errors';

jest.mock('./version_info');

const testWriter = new ToolingLogCollectingWriter();
const log = new ToolingLog();
log.setWriters([testWriter]);

expect.addSnapshotSerializer(createStripAnsiSerializer());

const STACK_TRACE = /(\│\s+)at .+ \(.+\)$/;
const isStackTrace = (x: any) => typeof x === 'string' && STACK_TRACE.test(x);

expect.addSnapshotSerializer(
  createRecursiveSerializer(
    (v) => Array.isArray(v) && v.some(isStackTrace),
    (v) => {
      const start = v.findIndex(isStackTrace);
      v[start] = v[start].replace(STACK_TRACE, '$1<stacktrace>');
      while (isStackTrace(v[start + 1])) v.splice(start + 1, 1);
      return v;
    }
  )
);

beforeEach(() => {
  testWriter.messages.length = 0;
  jest.clearAllMocks();
});

const setup = async () => {
  const config = await Config.create({
    isRelease: true,
    targetAllPlatforms: true,
    versionQualifier: '-SNAPSHOT',
    dockerContextUseLocalArtifact: false,
    dockerCrossCompile: false,
  });

  const run = createRunner({
    config,
    log,
  });

  return { config, run };
};

describe('default dist', () => {
  it('runs global task once, passing config and log', async () => {
    const { config, run } = await setup();

    const mock = jest.fn();

    await run({
      global: true,
      description: 'foo',
      run: mock,
    });

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenLastCalledWith(config, log, [expect.any(Build)]);
  });

  it('calls local tasks once, passing the default build', async () => {
    const { config, run } = await setup();

    const mock = jest.fn();

    await run({
      description: 'foo',
      run: mock,
    });

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(config, log, expect.any(Build));
  });
});

describe('task rejection', () => {
  it('rejects, logs error, and marks error logged', async () => {
    const { run } = await setup();

    const error = new Error('FOO');
    expect(isErrorLogged(error)).toBe(false);

    const promise = run({
      description: 'foo',
      async run() {
        throw error;
      },
    });

    await expect(promise).rejects.toThrowErrorMatchingInlineSnapshot(`"FOO"`);
    expect(testWriter.messages).toMatchInlineSnapshot(`
      Array [
        " info [  kibana  ] foo",
        "   │ERROR failure 0 sec",
        "   │ERROR Error: FOO",
        "   │          <stacktrace>",
        "",
      ]
    `);
    expect(isErrorLogged(error)).toBe(true);
  });

  it('just rethrows errors that have already been logged', async () => {
    const { run } = await setup();

    const error = markErrorLogged(new Error('FOO'));
    const promise = run({
      description: 'foo',
      async run() {
        throw error;
      },
    });

    await expect(promise).rejects.toThrowErrorMatchingInlineSnapshot(`"FOO"`);
    expect(testWriter.messages).toMatchInlineSnapshot(`
      Array [
        " info [  kibana  ] foo",
        "",
      ]
    `);
  });
});
