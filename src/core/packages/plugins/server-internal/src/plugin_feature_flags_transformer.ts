/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import type { IConfigService } from '@kbn/config';

export class PluginFeatureFlagsTransformer {
  private enableAllPluginFlags: boolean | null = null;

  constructor(private readonly configService: IConfigService) {
    this.subscribeToMasterFlag();
  }

  private subscribeToMasterFlag(): void {
    this.configService.atPath<{ featureFlags?: { enableAll?: boolean } }>('plugins').subscribe({
      next: (pluginsConfig) => {
        this.enableAllPluginFlags = pluginsConfig.featureFlags?.enableAll ?? null;
      },
      error: (_error) => {
        // Reset to null to indicate no master flag is set
        this.enableAllPluginFlags = null;
      },
    });
  }

  public transform(path: string, config: unknown): unknown {
    if (this.enableAllPluginFlags === null) return config;

    // Skip plugins config itself to avoid recursion
    if (path === 'plugins') return config;

    // Only process configs that have featureFlags
    if (!this.hasFeatureFlagsObject(config)) return config;

    return this.applyMasterFlagToConfig(config);
  }

  private hasFeatureFlagsObject(config: unknown): boolean {
    return (
      config !== null &&
      typeof config === 'object' &&
      'featureFlags' in config &&
      typeof (config as any).featureFlags === 'object'
    );
  }

  private applyMasterFlagToConfig(config: unknown): unknown {
    const cloned = cloneDeep(config);
    const featureFlags = (cloned as any).featureFlags;

    // Apply master flag to all boolean feature flags
    // This overrides both schema defaults and undefined values
    Object.keys(featureFlags).forEach((key) => {
      const value = featureFlags[key];

      // Only process boolean flags
      if (typeof value === 'boolean') {
        featureFlags[key] = this.enableAllPluginFlags;
      }
      // Non-boolean values are ignored (safety)
    });

    return cloned;
  }
}
