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

/** @internal */
export { LegacyPlatformProxifier } from './legacy_platform_proxifier';
/** @internal */
export { LegacyConfigToRawConfigAdapter, LegacyConfig } from './legacy_platform_config';
/** @internal */
export { LegacyKbnServer } from './legacy_kbn_server';

import {
  LegacyConfig,
  LegacyConfigToRawConfigAdapter,
  LegacyKbnServer,
  LegacyPlatformProxifier,
} from '.';
import { BehaviorSubject, k$, map } from '../../lib/kbn_observable';
import { Env } from '../config';
import { Root } from '../root';
import { BasePathProxyRoot } from '../root/base_path_proxy_root';

function initEnvironment(rawKbnServer: any) {
  const config: LegacyConfig = rawKbnServer.config;

  const legacyConfig$ = new BehaviorSubject(config);
  const config$ = k$(legacyConfig$)(
    map(legacyConfig => new LegacyConfigToRawConfigAdapter(legacyConfig))
  );

  const env = Env.createDefault({
    kbnServer: new LegacyKbnServer(rawKbnServer),
    // The defaults for the following parameters are retrieved by the legacy
    // platform from the command line or from `package.json` and stored in the
    // config, so we can borrow these parameters and avoid double parsing.
    mode: config.get('env'),
    packageInfo: config.get('pkg'),
  });

  return {
    config$,
    env,
    // Propagates legacy config updates to the new platform.
    updateConfig(legacyConfig: LegacyConfig) {
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
    proxyListener: new LegacyPlatformProxifier(new Root(config$, env)),
    updateConfig,
  };
};

export const createBasePathProxy = (rawKbnServer: any) => {
  const { env, config$ } = initEnvironment(rawKbnServer);
  return new BasePathProxyRoot(config$, env);
};
