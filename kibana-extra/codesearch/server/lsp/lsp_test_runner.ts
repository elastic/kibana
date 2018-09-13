/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* tslint:disable */

import { Repo, RequestType } from '../../model/test_config';
import { TypescriptServerLauncher } from './ts_launcher';
import { JavaLauncher } from './java_launcher';
import { RequestExpander } from './request_expander';
import { LspRequest } from '../../model';
import { GitOperations } from '../git_operations';
import { ServerOptions } from "../server_options";
import { ConsoleLoggerFactory } from "../utils/console_logger_factory";
import { RepositoryUtils } from '../../common/repository_utils';


const options = {
  enabled: true,
  queueIndex: '.codesearch-worker-queue',
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

export class LspTestRunner {
  private repo: Repo;
  public proxy: RequestExpander;

  constructor (repo: Repo) {
    this.repo = repo
    this.launchLspByLanguage();
  }

  public async sendRandomRequest(requestType: RequestType) {
    const repoPath: string = this.repo.path;
    const files = await this.getAllFile();
    const randomFile = files[Math.floor(Math.random() * files.length)];
    switch(requestType) {
      case RequestType.HOVER: {
        const req: LspRequest = {
          method: 'textDocument/hover',
          params: {
            textDocument: {
              uri: `file://${randomFile}`,
            },
            position: this.randomizePosition(),
          },
        };
        await this.launchRequest(req);
        break;
      }
      case RequestType.INITIALIZE: {
        this.proxy.initialize(repoPath);
        break;
      }
      case RequestType.FULL: {
        const req: LspRequest = {
          method: 'textDocument/full',
          params: {
            textDocument: {
              uri: `file://${randomFile}`,
            },
          },
        };
        await this.launchRequest(req);
        break;
      }
      default: {
        console.error('Unkown request type!');
        break;
      }
    }
  }

  private async launchRequest(req: LspRequest) {
    const start = Date.now();
    const response = await this.proxy.handleRequest(req);
    expect(response.result.contents).not.toHaveLength(0);
    console.log(`cost ${Date.now() - start}ms`);
  }

  private async getAllFile() {
    const gitOperator: GitOperations = new GitOperations(this.repo.path);
    try {
      const fileTree = await gitOperator.fileTree('', '');
      return RepositoryUtils.getAllFiles(fileTree).filter((filePath: string) => {
        return filePath.endsWith(this.repo.language);
      });
    } catch (e) {
      console.error(`Prepare lsp indexing requests error: ${e}`);
      throw e;
    }
  }

  private randomizePosition() {
    //TODO:pcxu randomize position according to source file
    return {
      line: 19,
      character: 2,
    }
  }

  private async launchLspByLanguage() {
    const language: string = this.repo.language;
    switch(language) {
      case 'java': {
        this.proxy = await this.launchJavaLanguageServer();
        break;
      }
      case 'ts': {
        this.proxy = await this.launchTypescriptLanguageServer();
        break;
      }
      default: {
        console.error('unknown language type');
        break;
      }
    }
  }

  private async launchTypescriptLanguageServer() {
    const launcher = new TypescriptServerLauncher('127.0.0.1', false, serverOptions, new ConsoleLoggerFactory());
    return launcher.launch(false, 1);
  }

  private async launchJavaLanguageServer() {
    const launcher = new JavaLauncher('127.0.0.1', false, serverOptions, new ConsoleLoggerFactory());
    return launcher.launch(false, 1);
  }
}
