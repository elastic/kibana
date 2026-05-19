/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
export type RawConfigAdapter = (rawConfig: Record<string, any>) => Record<string, any>;
export type RawConfigurationProvider = Pick<RawConfigService, 'getConfig$'>;
/** @internal */
export declare class RawConfigService {
  readonly configFiles: readonly string[];
  /**
   * The stream of configs read from the config file.
   *
   * This is the _raw_ config before any overrides are applied.
   */
  private readonly rawConfigFromFile$;
  private readonly config$;
  constructor(configFiles: readonly string[], configAdapter?: RawConfigAdapter);
  /**
   * Read the initial Kibana config.
   */
  loadConfig(): void;
  stop(): void;
  /**
   * Re-read the Kibana config.
   */
  reloadConfig(): void;
  getConfig$(): Observable<Record<string, any>>;
}
