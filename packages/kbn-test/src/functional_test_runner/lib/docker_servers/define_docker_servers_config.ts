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

import * as Rx from 'rxjs';

export interface DockerServerSpec {
  enabled: boolean;
  portInContainer: number;
  port: number;
  image: string;
  waitForLogLine?: RegExp | string;
  /** a function that should return an observable that will allow the tests to execute as soon as it emits anything */
  waitFor?: (server: DockerServer, logLine$: Rx.Observable<string>) => Rx.Observable<unknown>;
  /* additional command line arguments passed to docker run */
  args?: string[];
}

export interface DockerServer extends DockerServerSpec {
  name: string;
  url: string;
}

/**
 * Helper that helps authors use the type definitions for the section of the FTR config
 * under the `dockerServers` key.
 */
export function defineDockerServersConfig(config: { [name: string]: DockerServerSpec } | {}) {
  return config;
}
