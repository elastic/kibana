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

import { Server } from 'hapi';

import { LegacyRequest } from '../http';
import { mergeVars } from './merge_vars';
import { ILegacyInternals, LegacyPlugins, Vars, VarsInjector, LegacyConfig } from './types';

export class LegacyInternals implements ILegacyInternals {
  private readonly injectors = new Map<string, Set<VarsInjector>>();
  private cachedDefaultVars?: Vars;

  constructor(
    private readonly legacyPlugins: LegacyPlugins,
    private readonly config: LegacyConfig,
    private readonly server: Server
  ) {}

  private get defaultVars(): Vars {
    if (this.cachedDefaultVars) {
      return this.cachedDefaultVars;
    }

    const { defaultInjectedVarProviders = [] } = this.legacyPlugins.uiExports;

    return (this.cachedDefaultVars = defaultInjectedVarProviders.reduce(
      (vars, { fn, pluginSpec }) =>
        mergeVars(vars, fn(this.server, pluginSpec.readConfigValue(this.config, []))),
      {}
    ));
  }

  private replaceVars(vars: Vars, request: LegacyRequest) {
    const { injectedVarsReplacers = [] } = this.legacyPlugins.uiExports;

    return injectedVarsReplacers.reduce(
      async (injected, replacer) => replacer(await injected, request, this.server),
      Promise.resolve(vars)
    );
  }

  public injectUiAppVars(id: string, injector: VarsInjector) {
    if (!this.injectors.has(id)) {
      this.injectors.set(id, new Set());
    }

    this.injectors.get(id)!.add(injector);
  }

  public getInjectedUiAppVars(id: string) {
    return [...(this.injectors.get(id) || [])].reduce(
      async (promise, injector) => ({
        ...(await promise),
        ...(await injector(this.server)),
      }),
      Promise.resolve<Vars>({})
    );
  }

  public async getVars(id: string, request: LegacyRequest, injected: Vars = {}) {
    return this.replaceVars(
      mergeVars(this.defaultVars, await this.getInjectedUiAppVars(id), injected),
      request
    );
  }
}
