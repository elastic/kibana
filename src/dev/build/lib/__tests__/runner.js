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

import sinon from 'sinon';
import expect from '@kbn/expect';

import { ToolingLog } from '@kbn/dev-utils';
import { createRunner } from '../runner';
import { isErrorLogged, markErrorLogged } from '../errors';

describe('dev/build/lib/runner', () => {
  const sandbox = sinon.createSandbox();

  const config = {};

  const onLogLine = sandbox.stub();
  const log = new ToolingLog({
    level: 'verbose',
    writeTo: {
      write: onLogLine,
    },
  });

  const buildMatcher = sinon.match({
    isOss: sinon.match.func,
    resolvePath: sinon.match.func,
    resolvePathForPlatform: sinon.match.func,
    getPlatformArchivePath: sinon.match.func,
    getName: sinon.match.func,
    getLogTag: sinon.match.func,
  });

  const ossBuildMatcher = buildMatcher.and(sinon.match((b) => b.isOss(), 'is oss build'));
  const defaultBuildMatcher = buildMatcher.and(sinon.match((b) => !b.isOss(), 'is not oss build'));

  afterEach(() => sandbox.reset());

  describe('defaults', () => {
    const run = createRunner({
      config,
      log,
    });

    it('returns a promise', () => {
      expect(run({ run: sinon.stub() })).to.be.a(Promise);
    });

    it('runs global task once, passing config and log', async () => {
      const runTask = sinon.stub();
      await run({ global: true, run: runTask });
      sinon.assert.calledOnce(runTask);
      sinon.assert.calledWithExactly(runTask, config, log, sinon.match.array);
    });

    it('does not call local tasks', async () => {
      const runTask = sinon.stub();
      await run({ run: runTask });
      sinon.assert.notCalled(runTask);
    });
  });

  describe('buildOssDist = true, buildDefaultDist = true', () => {
    const run = createRunner({
      config,
      log,
      buildOssDist: true,
      buildDefaultDist: true,
    });

    it('runs global task once, passing config and log', async () => {
      const runTask = sinon.stub();
      await run({ global: true, run: runTask });
      sinon.assert.calledOnce(runTask);
      sinon.assert.calledWithExactly(runTask, config, log, sinon.match.array);
    });

    it('runs local tasks twice, passing config log and both builds', async () => {
      const runTask = sinon.stub();
      await run({ run: runTask });
      sinon.assert.calledTwice(runTask);
      sinon.assert.calledWithExactly(runTask, config, log, ossBuildMatcher);
      sinon.assert.calledWithExactly(runTask, config, log, defaultBuildMatcher);
    });
  });

  describe('just default dist', () => {
    const run = createRunner({
      config,
      log,
      buildDefaultDist: true,
    });

    it('runs global task once, passing config and log', async () => {
      const runTask = sinon.stub();
      await run({ global: true, run: runTask });
      sinon.assert.calledOnce(runTask);
      sinon.assert.calledWithExactly(runTask, config, log, sinon.match.array);
    });

    it('runs local tasks once, passing config log and default build', async () => {
      const runTask = sinon.stub();
      await run({ run: runTask });
      sinon.assert.calledOnce(runTask);
      sinon.assert.calledWithExactly(runTask, config, log, defaultBuildMatcher);
    });
  });

  describe('just oss dist', () => {
    const run = createRunner({
      config,
      log,
      buildOssDist: true,
    });

    it('runs global task once, passing config and log', async () => {
      const runTask = sinon.stub();
      await run({ global: true, run: runTask });
      sinon.assert.calledOnce(runTask);
      sinon.assert.calledWithExactly(runTask, config, log, sinon.match.array);
    });

    it('runs local tasks once, passing config log and oss build', async () => {
      const runTask = sinon.stub();
      await run({ run: runTask });
      sinon.assert.calledOnce(runTask);
      sinon.assert.calledWithExactly(runTask, config, log, ossBuildMatcher);
    });
  });

  describe('task rejects', () => {
    const run = createRunner({
      config,
      log,
      buildOssDist: true,
    });

    it('rejects, logs error, and marks error logged', async () => {
      try {
        await run({
          async run() {
            throw new Error('FOO');
          },
        });
        throw new Error('expected run() to reject');
      } catch (error) {
        expect(error).to.have.property('message').be('FOO');
        sinon.assert.calledWith(onLogLine, sinon.match(/FOO/));
        expect(isErrorLogged(error)).to.be(true);
      }
    });

    it('just rethrows errors that have already been logged', async () => {
      try {
        await run({
          async run() {
            throw markErrorLogged(new Error('FOO'));
          },
        });

        throw new Error('expected run() to reject');
      } catch (error) {
        expect(error).to.have.property('message').be('FOO');
        sinon.assert.neverCalledWith(onLogLine, sinon.match(/FOO/));
        expect(isErrorLogged(error)).to.be(true);
      }
    });
  });
});
