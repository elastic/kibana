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

import { RunContext, TaskInstance } from '../task';

/*
 * BeforeSaveMiddlewareParams is nearly identical to RunContext, but
 * taskInstance is before save (no _id property)
 * 
 * taskInstance property is guaranteed to exist. The params can optionally
 * include fields from an "options" object passed as the 2nd parameter to
 * taskManager.schedule()
 */
export interface BeforeSaveMiddlewareParams {
  taskInstance: TaskInstance;
}

export type BeforeSaveFunction = (
  params: BeforeSaveMiddlewareParams
) => Promise<BeforeSaveMiddlewareParams>;

export type BeforeRunFunction = (params: RunContext) => Promise<RunContext>;

export interface Middleware {
  beforeSave: BeforeSaveFunction;
  beforeRun: BeforeRunFunction;
}

export function addMiddlewareToChain(prevMiddleware: Middleware, middleware: Middleware) {
  const beforeSave = middleware.beforeSave
    ? (params: BeforeSaveMiddlewareParams) =>
        middleware.beforeSave(params).then(prevMiddleware.beforeSave)
    : prevMiddleware.beforeSave;

  const beforeRun = middleware.beforeRun
    ? (params: RunContext) => middleware.beforeRun(params).then(prevMiddleware.beforeRun)
    : prevMiddleware.beforeRun;

  return {
    beforeSave,
    beforeRun,
  };
}
