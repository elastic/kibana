/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertConfig } from './assert_config';
import type { InitialBenchConfigWithPath } from './types';

export async function parseConfigs(paths: string[]): Promise<InitialBenchConfigWithPath[]> {
  const initialConfigs: InitialBenchConfigWithPath[] = [];
  for (const configPath of paths) {
    const mod = await import(configPath);
    let exported = mod.default;

    if (typeof exported === 'function') {
      exported = await exported();
    }

    try {
      assertConfig(exported);
    } catch (error) {
      throw new Error(`Failed to parse config for ${configPath}`, { cause: error });
    }

    initialConfigs.push({
      ...exported,
      path: configPath,
    });
  }

  return initialConfigs;
}
