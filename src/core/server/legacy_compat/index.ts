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

import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

/** @internal */
export { LegacyPlatformProxifier } from './legacy_platform_proxifier';
/** @internal */
export { LegacyObjectToConfigAdapter } from './config/legacy_object_to_config_adapter';

import { LegacyObjectToConfigAdapter, LegacyPlatformProxifier } from '.';
import { Env } from '../config';
import { Root } from '../root';
import { BasePathProxyRoot } from '../root/base_path_proxy_root';

function initEnvironment(rawKbnServer: any, isDevClusterMaster = false) {
  const env = Env.createDefault({
    // The core doesn't work with configs yet, everything is provided by the
    // "legacy" Kibana, so we can have empty array here.
    configs: [],
    // `dev` is the only CLI argument we currently use.
    cliArgs: { dev: rawKbnServer.config.get('env.dev') },
    isDevClusterMaster,
  });

  const legacyConfig$ = new BehaviorSubject<Record<string, any>>(rawKbnServer.config.get());
  return {
    config$: legacyConfig$.pipe(map(legacyConfig => new LegacyObjectToConfigAdapter(legacyConfig))),
    env,
    // Propagates legacy config updates to the new platform.
    updateConfig(legacyConfig: Record<string, any>) {
      legacyConfig$.next(legacyConfig);
    },
  };
}

/**
 * @internal
 */
export const injectIntoKbnServer = (rawKbnServer: any) => {
  const { env, config$, updateConfig } = initEnvironment(rawKbnServer);

  rawKbnServer.newPlatform = {
    // Custom HTTP Listener that will be used within legacy platform by HapiJS server.
    proxyListener: new LegacyPlatformProxifier(new Root(config$, env), env),
    updateConfig,
  };
};

export const createBasePathProxy = (rawKbnServer: any) => {
  const { env, config$ } = initEnvironment(rawKbnServer, true /*isDevClusterMaster*/);
  return new BasePathProxyRoot(config$, env);
};
