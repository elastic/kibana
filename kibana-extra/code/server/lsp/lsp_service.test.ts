/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* tslint:disable */

import fs from 'fs';
import Git from 'nodegit';
import rimraf from 'rimraf';
import { LspService } from "./lsp_service";
import { ServerOptions } from "../server_options";
import { ConsoleLoggerFactory } from "../utils/console_logger_factory";
import { REPOSITORY_GIT_STATUS_INDEX_TYPE } from "../../mappings";
import sinon from 'sinon';
import path from 'path';

jest.setTimeout(30000);

function prepareProject(url: string, path: string) {
  return new Promise(resolve => {
    if (!fs.existsSync(path)) {
      rimraf(path, error => {
        Git.Clone.clone(url, path).then(repo => {
          resolve(repo);
        });
      });
    } else {
      resolve();
    }
  });
}

// function delay(seconds: number) {
//   return new Promise(resolve => {
//     setTimeout(() => resolve(), seconds * 1000);
//   });
// }

const options = {
  enabled: true,
  queueIndex: '.code-worker-queue',
  queueTimeout: 60 * 60 * 1000, // 1 hour by default
  updateFreqencyMs: 5 * 60 * 1000, // 5 minutes by default
  indexFrequencyMs: 24 * 60 * 60 * 1000, // 1 day by default
  lspRequestTimeout: 5 * 60, // timeout a request over 30s
  repos: [],
  maxWorkspace: 5, // max workspace folder for each language server
  isAdmin: true, // If we show the admin buttons
  disableScheduler: true, // Temp option to disable all schedulers.
};

const config = {
  get(key: string) {
    if (key === 'path.data') {
      return '/tmp/test'
    }
  }
};

const serverOptions = new ServerOptions(options, config);

function mockObjectsClient() {
  const api = {
    get: function (indexName: string, key: string) {
      if (indexName === REPOSITORY_GIT_STATUS_INDEX_TYPE) {
        return {
          attributes: {
            cloneProgress: {
              isCloned: true
            }
          }
        }
      }
    }
  };
  return api;
}

const repoUri = 'github.com/Microsoft/TypeScript-Node-Starter';

function cleanWorkspace() {
  return new Promise(resolve => {
    rimraf(serverOptions.workspacePath, resolve);
  })
}

beforeEach(async () => {
  await prepareProject(
    'https://github.com/Microsoft/TypeScript-Node-Starter.git',
    path.join(serverOptions.repoPath, repoUri)
  );
});

afterAll(() => {
  return cleanWorkspace();
});

function comparePath(pathA: string, pathB: string) {
  const pa = fs.realpathSync(pathA);
  const pb = fs.realpathSync(pathB);
  return path.resolve(pa) === path.resolve(pb);
}

test('process a hover request', async () => {

  let objectsClient = mockObjectsClient();
  const revision = 'master';

  const lspservice = new LspService('127.0.0.1', serverOptions, objectsClient, new ConsoleLoggerFactory());
  try {
    const params = {
      textDocument: {
        uri: `git://${repoUri}/blob/${revision}/src/app.ts`,
      },
      position: {
        line: 19,
        character: 2,
      }
    };
    const workspaceHandler = lspservice.workspaceHandler;
    const wsSpy = sinon.spy(workspaceHandler, 'handleRequest');
    const controller = lspservice.controller;
    const ctrlSpy = sinon.spy(controller, 'handleRequest');

    let method = 'textDocument/hover';

    const response = await lspservice.sendRequest(method, params);
    expect(response).toBeTruthy();
    expect(response.result.contents).toBeDefined();


    wsSpy.restore();
    ctrlSpy.restore();

    const workspaceFolderExists = fs.existsSync(path.join(serverOptions.workspacePath, repoUri, revision));
    // workspace is opened
    expect(workspaceFolderExists).toBeTruthy();

    const workspacePath = fs.realpathSync(path.resolve(serverOptions.workspacePath, repoUri, revision));
    // workspace handler is working, filled workspacePath
    sinon.assert.calledWith(ctrlSpy, sinon.match.has("workspacePath", sinon.match((value) => comparePath(value, workspacePath))));
    // uri is changed by workspace handler
    sinon.assert.calledWith(ctrlSpy, sinon.match.hasNested("params.textDocument.uri", `file://${workspacePath}/src/app.ts` ));



  } finally {
    await lspservice.shutdown()
  }
  return undefined;
});

test("unload a workspace", async() => {
  let objectsClient = mockObjectsClient();
  const revision = 'master';
  const lspservice = new LspService('127.0.0.1', serverOptions, objectsClient, new ConsoleLoggerFactory());
  try {
    const params = {
      textDocument: {
        uri: `git://${repoUri}/blob/${revision}/src/app.ts`,
      },
      position: {
        line: 19,
        character: 2,
      }
    };

    let method = 'textDocument/hover';
    // send a dummy request to open a workspace;
    const response = await lspservice.sendRequest(method, params);
    expect(response).toBeTruthy();
    const workspacePath = path.resolve(serverOptions.workspacePath, repoUri, revision);
    const workspaceFolderExists = fs.existsSync(workspacePath);
    // workspace is opened
    expect(workspaceFolderExists).toBeTruthy();
    const controller = lspservice.controller;
    // @ts-ignore
    const languageServer = controller.languageServerMap['typescript'];
    const realWorkspacePath = fs.realpathSync(workspacePath);

    // @ts-ignore
    const handler = languageServer.languageServerHandlers[realWorkspacePath];
    const exitSpy = sinon.spy(handler, 'exit');
    const unloadSpy = sinon.spy(handler, 'unloadWorkspace');

    await lspservice.deleteWorkspace(repoUri);

    unloadSpy.restore();
    exitSpy.restore();

    sinon.assert.calledWith(unloadSpy, realWorkspacePath);
    // typescript language server for this workspace should be closed
    sinon.assert.calledOnce(exitSpy);
    // the workspace folder should be deleted
    const exists = fs.existsSync(realWorkspacePath);
    expect(exists).toBeFalsy();

  } finally {
    await lspservice.shutdown()
  }
  return undefined;
});

