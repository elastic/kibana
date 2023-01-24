/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';

export interface DockerServerSpec {
  enabled: boolean;
  portInContainer: number;
  port: number;
  image: string;
  waitForLogLine?: RegExp | string;
  waitForLogLineTimeoutMs?: number;
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
