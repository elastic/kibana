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

import { resolve } from 'path';

export interface IProjectPathOptions {
  'skip-kibana-plugins'?: boolean;
  oss?: boolean;
}

/**
 * Returns all the paths where plugins are located
 */
export function getProjectPaths(rootPath: string, options: IProjectPathOptions = {}) {
  const skipKibanaPlugins = Boolean(options['skip-kibana-plugins']);
  const ossOnly = Boolean(options.oss);

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
  projectPaths.push(resolve(rootPath, 'examples/*'));

  if (!ossOnly) {
    projectPaths.push(resolve(rootPath, 'x-pack'));
    projectPaths.push(resolve(rootPath, 'x-pack/legacy/plugins/*'));
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
