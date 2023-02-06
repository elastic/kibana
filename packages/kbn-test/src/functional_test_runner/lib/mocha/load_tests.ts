/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isAbsolute } from 'path';

import type { ToolingLog } from '@kbn/tooling-log';

import type { Config } from '../config';
import type { GenericFtrProviderContext } from '../../public_types';
import type { Lifecycle } from '../lifecycle';
import type { ProviderCollection } from '../providers';
import { loadTracer } from '../load_tracer';
import { decorateSnapshotUi } from '../snapshots/decorate_snapshot_ui';

import { decorateMochaUi } from './decorate_mocha_ui';

type TestProvider = (ctx: GenericFtrProviderContext<any, any>) => void;

interface Options {
  mocha: any;
  log: ToolingLog;
  config: Config;
  lifecycle: Lifecycle;
  providers: ProviderCollection;
  paths: string[];
  updateBaselines: boolean;
  updateSnapshots: boolean;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/**
 *  Load an array of test files or a test provider into a mocha instance
 */
export const loadTests = ({
  mocha,
  log,
  config,
  lifecycle,
  providers,
  paths,
  updateBaselines,
  updateSnapshots,
}: Options) => {
  const ctx: GenericFtrProviderContext<any, any> = {
    loadTestFile,
    getService: providers.getService as any,
    hasService: providers.hasService as any,
    getPageObject: providers.getPageObject as any,
    getPageObjects: providers.getPageObjects as any,
    updateBaselines,
  };

  decorateSnapshotUi({ lifecycle, updateSnapshots, isCi: !!process.env.CI });

  function loadTestFile(path: string) {
    if (typeof path !== 'string' || !isAbsolute(path)) {
      throw new TypeError('loadTestFile() only accepts absolute paths');
    }

    loadTracer(path, `testFile[${path}]`, () => {
      log.verbose('Loading test file %s', path);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const testModule = require(path);
      const testProvider = testModule.__esModule ? testModule.default : testModule;

      runTestProvider(testProvider, path);
    });
  }

  function withMocha(debugPath: string, fn: () => void) {
    // mocha.suite hocus-pocus comes from: https://git.io/vDnXO
    const context = decorateMochaUi(lifecycle, global, {
      rootTags: config.get('rootTags'),
    });
    mocha.suite.emit('pre-require', context, debugPath, mocha);

    fn();

    mocha.suite.emit('require', undefined, debugPath, mocha);
    mocha.suite.emit('post-require', global, debugPath, mocha);

    context.revertProxiedAssignments();
  }

  function runTestProvider(provider: TestProvider, path: string) {
    if (typeof provider !== 'function') {
      throw new Error(`Default export of test files must be a function, got ${provider}`);
    }

    loadTracer(provider, `testProvider[${path}]`, () => {
      withMocha(path, () => {
        const returnVal = provider(ctx);
        if (isObj(returnVal) && typeof returnVal.then === 'function') {
          throw new TypeError('Test file providers must not be async or return promises');
        }
      });
    });
  }

  const cm = config.module;
  if (cm.type === 'journey') {
    withMocha(cm.path, () => {
      cm.journey.testProvider(ctx);
    });
  } else {
    paths.forEach(loadTestFile);
  }
};
