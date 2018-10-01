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
import { MigrationUI } from './migration_ui';

describe('migration_ui', () => {
  it('registers the migration progress API endpoint', () => {
    const route = sinon.spy();
    const ext = sinon.spy();
    const server: any = {
      route,
      ext,
    };
    const migrator: any = {};
    // tslint:disable-next-line:no-unused-expression
    new MigrationUI(server, migrator);
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
      disable: true,
      accept: 'application/json',
      path: '/some/where',
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
    const progress = Math.random();
    const result = await testRequest({
      progress,
      disable: true,
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
      accept: '*/*',
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
        accept: 'application/json',
        path: '/somepath',
      })
    ).rejects.toThrow(/Kibana is migrating/);
  });
});

async function testRequest(opts: any) {
  let onRequest: any;
  const continueResult = Math.random();
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
  };
  const migrator: any = {
    requiresMigration: opts.requiresMigration !== false,
    fetchProgress: async () => opts.progress,
  };
  const ui = new MigrationUI(server, migrator);

  if (opts.disable) {
    ui.disable();
  }

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
