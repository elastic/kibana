/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

const setup = async (opts: { buildDefaultDist: boolean; buildOssDist: boolean }) => {
  const config = await Config.create({
    isRelease: true,
    targetAllPlatforms: true,
    versionQualifier: '-SNAPSHOT',
  });

  const run = createRunner({
    config,
    log,
    ...opts,
  });

  return { config, run };
};

describe('buildOssDist = true, buildDefaultDist = true', () => {
  it('runs global task once, passing config and log', async () => {
    const { config, run } = await setup({
      buildDefaultDist: true,
      buildOssDist: true,
    });

    const mock = jest.fn();

    await run({
      global: true,
      description: 'foo',
      run: mock,
    });

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenLastCalledWith(config, log, [expect.any(Build), expect.any(Build)]);
  });

  it('calls local tasks twice, passing each build', async () => {
    const { config, run } = await setup({
      buildDefaultDist: true,
      buildOssDist: true,
    });

    const mock = jest.fn();

    await run({
      description: 'foo',
      run: mock,
    });

    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock).toHaveBeenCalledWith(config, log, expect.any(Build));
  });
});

describe('just default dist', () => {
  it('runs global task once, passing config and log', async () => {
    const { config, run } = await setup({
      buildDefaultDist: true,
      buildOssDist: false,
    });

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
    const { config, run } = await setup({
      buildDefaultDist: true,
      buildOssDist: false,
    });

    const mock = jest.fn();

    await run({
      description: 'foo',
      run: mock,
    });

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(config, log, expect.any(Build));
    const [args] = mock.mock.calls;
    const [, , build] = args;
    if (build.isOss()) {
      throw new Error('expected build to be the default dist, not the oss dist');
    }
  });
});

describe('just oss dist', () => {
  it('runs global task once, passing config and log', async () => {
    const { config, run } = await setup({
      buildDefaultDist: false,
      buildOssDist: true,
    });

    const mock = jest.fn();

    await run({
      global: true,
      description: 'foo',
      run: mock,
    });

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenLastCalledWith(config, log, [expect.any(Build)]);
  });

  it('calls local tasks once, passing the oss build', async () => {
    const { config, run } = await setup({
      buildDefaultDist: false,
      buildOssDist: true,
    });

    const mock = jest.fn();

    await run({
      description: 'foo',
      run: mock,
    });

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(config, log, expect.any(Build));
    const [args] = mock.mock.calls;
    const [, , build] = args;
    if (!build.isOss()) {
      throw new Error('expected build to be the oss dist, not the default dist');
    }
  });
});

describe('task rejection', () => {
  it('rejects, logs error, and marks error logged', async () => {
    const { run } = await setup({
      buildDefaultDist: true,
      buildOssDist: false,
    });

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
    const { run } = await setup({
      buildDefaultDist: true,
      buildOssDist: false,
    });

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
