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

import { isWorker } from 'cluster';

export default async (kbnServer) => {
  if (!isWorker) {
    throw new Error(`watch optimization is only available when using the "--dev" cli flag`);
  }

  /**
   * When running in watch mode two processes run in one of the following modes:
   *
   * optmzr: this process runs the WatchOptimizer and the WatchServer
   *   which serves the WatchOptimizer's output and blocks requests
   *   while the optimizer is running
   *
   * server: this process runs the entire kibana server and proxies
   *   all requests for /bundles/* or /built_assets/dlls/* to the optmzr process
   *
   * @param  {string} process.env.kbnWorkerType
   */
  switch (process.env.kbnWorkerType) {
    case 'optmzr':
      await kbnServer.mixin(require('./optmzr_role'));
      break;

    case 'server':
      await kbnServer.mixin(require('./proxy_role'));
      break;

    default:
      throw new Error(`unknown kbnWorkerType "${process.env.kbnWorkerType}"`);
  }
};
