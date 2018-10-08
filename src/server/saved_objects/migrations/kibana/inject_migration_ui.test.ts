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

import _ from 'lodash';
import sinon from 'sinon';
import { injectMigrationUI } from './inject_migration_ui';

/**
 * This tests the server-side of the migration UI logic. The client-side
 * is tested independently (see plugin_functional/test_suites/migration_ui).
 */
describe('injectMigrationUI', () => {
  it('registers the migration progress API endpoint', async () => {
    const route = sinon.spy();
    const ext = sinon.spy();
    const server: any = {
      route,
      ext,
      kibanaMigrator: {
        fetchMigrationProgress: async () => 0,
        awaitMigration: async () => ({ status: 'skipped' }),
      },
    };

    await injectMigrationUI(server);

    expect(route.args[0]).toMatchObject([
      {
        path: '/api/migration_progress',
      },
    ]);

    sinon.assert.calledWith(ext, 'onRequest');
  });

  it('passes HTML requests through when disabled', async () => {
    const result = await testRequest({
      disable: true,
      accept: '*/*',
      path: '/some/where',
    });
    expect(result.returnValue).toEqual(result.continueResult);
    sinon.assert.calledOnce(result.continue);
    sinon.assert.notCalled(result.view);
    sinon.assert.notCalled(result.response);
    sinon.assert.notCalled(result.takeover);
    sinon.assert.notCalled(result.type);
  });

  it('passes API requests through when disabled', async () => {
    const result = await testRequest({
      progress: 1,
      accept: 'application/json',
      path: '/api/shenanigans',
    });
    expect(result.returnValue).toEqual(result.continueResult);
    sinon.assert.calledOnce(result.continue);
    sinon.assert.notCalled(result.view);
    sinon.assert.notCalled(result.response);
    sinon.assert.notCalled(result.takeover);
    sinon.assert.notCalled(result.type);
  });

  it('serves progress JSON when enabled', async () => {
    const progress = Math.random();
    const result = await testRequest({
      progress,
      accept: 'application/json',
      path: '/api/migration_progress',
    });
    expect(result.returnValue).toEqual(result.responseResult);
    sinon.assert.notCalled(result.continue);
    sinon.assert.notCalled(result.view);
    sinon.assert.calledWith(result.response, { progress });
    sinon.assert.calledOnce(result.takeover);
    sinon.assert.calledWith(result.type, 'application/json');
  });

  it('serves progress JSON when disabled', async () => {
    const progress = 1;
    const result = await testRequest({
      progress,
      accept: 'application/json',
      path: '/api/migration_progress',
    });
    expect(result.returnValue).toEqual(result.responseResult);
    sinon.assert.notCalled(result.continue);
    sinon.assert.notCalled(result.view);
    sinon.assert.calledWith(result.response, { progress });
    sinon.assert.calledOnce(result.takeover);
    sinon.assert.calledWith(result.type, 'application/json');
  });

  it('intercepts HTML requests when enabled', async () => {
    const result = await testRequest({
      progress: 0.1,
      accept: undefined,
      path: '/somepath',
    });

    expect(result.returnValue).toEqual(result.viewResult);
    sinon.assert.notCalled(result.continue);
    sinon.assert.notCalled(result.response);
    sinon.assert.calledWith(result.view, 'migration_ui', {
      migrationProgressUrl: sinon.match.string,
      uiPublicUrl: sinon.match.string,
      i18n: sinon.match.func,
    });
    sinon.assert.calledOnce(result.takeover);
    sinon.assert.calledWith(result.type, 'text/html');
  });

  it('rejects API requests when enabled', async () => {
    await expect(
      testRequest({
        progress: 0.1,
        accept: 'application/json',
        path: '/somepath',
      })
    ).rejects.toThrow(/Kibana is migrating/);
  });
});

async function testRequest(opts: any) {
  let onRequest: any;
  const continueResult = 'to be continued...';
  const takeover = sinon.spy(() => undefined);
  const type = sinon.spy(() => undefined);
  const viewResult = { takeover, type };
  const responseResult = { takeover, type };
  const route = sinon.spy();
  const h = {
    continue: sinon.spy(() => continueResult),
    response: sinon.spy(() => responseResult),
    view: sinon.spy(() => viewResult),
  };
  const request = {
    headers: { accept: opts.accept },
    url: { path: opts.path },
  };
  const server: any = {
    route,
    ext(path: string, handler: any) {
      expect(path).toEqual('onRequest');
      onRequest = handler;
    },
    config() {
      return {
        get() {
          return 'mehbase';
        },
      };
    },
    kibanaMigrator: {
      awaitMigration: () => new Promise(r => setTimeout(r, 1)),
      fetchMigrationProgress: async () => opts.progress,
    },
  };

  await injectMigrationUI(server);

  return {
    takeover,
    type,
    viewResult,
    responseResult,
    continueResult,
    route,
    continue: h.continue,
    response: h.response,
    view: h.view,
    returnValue: await onRequest(request, h),
  };
}
