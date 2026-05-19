/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Config, ConfigPath } from '..';
/**
 * Allows plain javascript object to behave like `RawConfig` instance.
 * @internal
 */
export declare class ObjectToConfigAdapter implements Config {
  private readonly rawConfig;
  constructor(rawConfig: Record<string, any>);
  has(configPath: ConfigPath): boolean;
  get(configPath: ConfigPath): any;
  set(configPath: ConfigPath, value: any): void;
  getFlattenedPaths(): string[];
  toRaw(): Record<string, any>;
}
