/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { setImmediate } from 'timers/promises';
import { compileProxiedPlugin, parsePlugin } from './plugin_compiler';
import { readFile } from 'fs/promises';

export async function requireIsolate(root: string, modulePath: string, initializerContext: any) {
  console.log('modulePath::', modulePath)
  const zipFileBuffer = await readFile(modulePath);
  const pluginContent = await parsePlugin(root, zipFileBuffer);
  const isolateInstance = compileProxiedPlugin(pluginContent, initializerContext);

  // console.log('requiring in isolate::', modulePath)
  // require plugin inside VM isolate
  // const isolateModule = _require(modulePath);
  // console.log('require.cache::', require.cache);
  return {
    isolateInstance,
    isolateTeardown: async () => {
      console.log('tearing down!');
      // the immediate blocks are needed to ensure that the worker
      // has actually finished its work before closing
      await setImmediate();
      // await isolate.stop();
      // isolateModule.terminate();
      // await isolate.stop();
      await setImmediate();
    },
  };
}
