/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';

interface Options {
  rootPath: string;
  skipKibanaPlugins?: boolean;
  ossOnly?: boolean;
}

/**
 * Returns all the paths where plugins are located
 */
export function getProjectPaths({ rootPath, ossOnly, skipKibanaPlugins }: Options) {
  const projectPaths = [rootPath, resolve(rootPath, 'packages/*')];

  // This is needed in order to install the dependencies for the declared
  // plugin functional used in the selenium functional tests.
  // As we are now using the webpack dll for the client vendors dependencies
  // when we run the plugin functional tests against the distributable
  // dependencies used by such plugins like @eui, react and react-dom can't
  // be loaded from the dll as the context is different from the one declared
  // into the webpack dll reference plugin.
  // In anyway, have a plugin declaring their own dependencies is the
  // correct and the expect behavior.
  projectPaths.push(resolve(rootPath, 'test/plugin_functional/plugins/*'));
  projectPaths.push(resolve(rootPath, 'test/interpreter_functional/plugins/*'));
  projectPaths.push(resolve(rootPath, 'test/server_integration/__fixtures__/plugins/*'));
  projectPaths.push(resolve(rootPath, 'examples/*'));

  if (!ossOnly) {
    projectPaths.push(resolve(rootPath, 'x-pack'));
    projectPaths.push(resolve(rootPath, 'x-pack/plugins/*'));
    projectPaths.push(resolve(rootPath, 'x-pack/legacy/plugins/*'));
    projectPaths.push(resolve(rootPath, 'x-pack/test/functional_with_es_ssl/fixtures/plugins/*'));
  }

  if (!skipKibanaPlugins) {
    projectPaths.push(resolve(rootPath, '../kibana-extra/*'));
    projectPaths.push(resolve(rootPath, '../kibana-extra/*/packages/*'));
    projectPaths.push(resolve(rootPath, '../kibana-extra/*/plugins/*'));
    projectPaths.push(resolve(rootPath, 'plugins/*'));
    projectPaths.push(resolve(rootPath, 'plugins/*/packages/*'));
    projectPaths.push(resolve(rootPath, 'plugins/*/plugins/*'));
  }

  return projectPaths;
}
