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

import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { RenderingSetupDeps, RenderingServiceSetup, VarProvider } from './types';
import { RenderingProvider } from './rendering_provider';

/** @internal */
export class RenderingService implements CoreService<RenderingServiceSetup> {
  private varProviders = new Map<string, Set<VarProvider>>();

  constructor(private readonly coreContext: CoreContext) {}

  public async setup(deps: RenderingSetupDeps): Promise<RenderingServiceSetup> {
    const getVarsFor = async (id: string) =>
      await [...(this.varProviders.get(id) || [])].reduce(
        async (vars, provider) => ({ ...(await vars), ...(await provider(deps.http.server)) }),
        {}
      );

    return {
      getRenderingProvider: params =>
        new RenderingProvider({ ...deps, ...params, getVarsFor, env: this.coreContext.env }),
      registerVarProvider: (id, provider) => {
        if (!this.varProviders.has(id)) {
          this.varProviders.set(id, new Set());
        }

        this.varProviders.get(id)!.add(provider);
      },
      getVarsFor: async id => {
        if (!this.varProviders.has(id)) {
          return {};
        }

        return await [...this.varProviders.get(id)!].reduce(
          async (vars, provider) => ({ ...(await vars), ...(await provider(deps.http.server)) }),
          {}
        );
      },
    };
  }

  public async start() {}

  public async stop() {}
}
