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
import { ElasticsearchPlugin } from '../core_plugins/elasticsearch';

export interface KibanaConfig {
  get<T = any>(key: string): T;
}

// Extend the defaults with the plugins and server methods we need.
declare module 'hapi' {
  interface PluginProperties {
    elasticsearch: ElasticsearchPlugin;
    kibana: any;
  }

  interface Server {
    config: () => KibanaConfig;
  }
}

type KbnMixinFunc = (kibana: any, server: Server, config: any) => Promise<any> | void;

export default class KbnServer {
  public static mock: any;
  public static mockClear: () => void;

  public server: Server;
  public inject: Server['inject'];

  constructor(settings: any, core: any);

  public ready(): Promise<void>;
  public mixin(...fns: KbnMixinFunc[]): Promise<void>;
  public listen(): Promise<Server>;
  public close(): Promise<void>;
  public applyLoggingConfiguration(settings: any): void;
}

export { Server, Request, ResponseToolkit } from 'hapi';
