/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  HousekeepingCheck,
  HousekeepingResourceProvider,
  HousekeepingResourceTypeDefinition,
} from './types';

export class HousekeepingRegistry {
  private readonly providers = new Map<string, HousekeepingResourceProvider>();
  private readonly checks = new Map<string, HousekeepingCheck>();
  private readonly resourceTypes = new Map<string, HousekeepingResourceTypeDefinition>();

  registerResourceProvider(provider: HousekeepingResourceProvider) {
    this.assertNewId(provider.id);
    for (const type of provider.resourceTypes) {
      if (this.resourceTypes.has(type.id)) {
        throw new Error(`Housekeeping resource type [${type.id}] is already registered`);
      }
    }

    this.providers.set(provider.id, provider);
    for (const type of provider.resourceTypes) {
      this.resourceTypes.set(type.id, type);
    }
  }

  registerCheck(check: HousekeepingCheck) {
    this.assertNewId(check.id);
    this.checks.set(check.id, check);
  }

  /** Providers and checks share ids: both identify the checks that could not run. */
  private assertNewId(id: string) {
    if (this.providers.has(id) || this.checks.has(id)) {
      throw new Error(`Housekeeping provider or check [${id}] is already registered`);
    }
  }

  getProviders() {
    return [...this.providers.values()];
  }

  getChecks() {
    return [...this.checks.values()];
  }

  getResourceTypes() {
    return [...this.resourceTypes.values()];
  }

  getResourceType(id: string) {
    return this.resourceTypes.get(id);
  }
}
