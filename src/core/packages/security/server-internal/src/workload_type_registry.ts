/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceAccountWorkloadTypeRegistration } from '@kbn/core-security-server';
import {
  SERVICE_ACCOUNT_WORKLOAD_TYPE_MAX_LENGTH,
  SERVICE_ACCOUNT_WORKLOAD_TYPE_REGEX,
} from '@kbn/core-security-server';

/**
 * The workload types plugins have registered, keyed by plugin. Lives in Core because Core is the
 * only party that knows which plugin is calling; the security plugin only ever sees the plugin id
 * Core hands it.
 */
export class WorkloadTypeRegistry {
  private readonly byPlugin = new Map<
    string,
    Map<string, ServiceAccountWorkloadTypeRegistration>
  >();

  /**
   * Records a workload type for a plugin. Throws on an invalid type or name, and when the plugin
   * has already registered that type.
   */
  public register(pluginId: string, registration: ServiceAccountWorkloadTypeRegistration): void {
    const { type, name } = registration;

    if (type.length > SERVICE_ACCOUNT_WORKLOAD_TYPE_MAX_LENGTH) {
      throw new Error(
        `Service account workload type registered by plugin [${pluginId}] is too long: it must be at most ${SERVICE_ACCOUNT_WORKLOAD_TYPE_MAX_LENGTH} characters, but got ${type.length}.`
      );
    }

    if (!SERVICE_ACCOUNT_WORKLOAD_TYPE_REGEX.test(type)) {
      throw new Error(
        `Invalid service account workload type [${type}] registered by plugin [${pluginId}]: only lowercase letters, digits and underscores are allowed.`
      );
    }

    if (name.trim().length === 0) {
      throw new Error(
        `Service account workload type [${type}] registered by plugin [${pluginId}] must have a non-empty name.`
      );
    }

    const types = this.byPlugin.get(pluginId) ?? new Map();
    if (types.has(type)) {
      throw new Error(
        `Service account workload type [${type}] has already been registered by plugin [${pluginId}].`
      );
    }

    types.set(type, { ...registration });
    this.byPlugin.set(pluginId, types);
  }

  public isRegistered(pluginId: string, type: string): boolean {
    return this.byPlugin.get(pluginId)?.has(type) ?? false;
  }

  public get(pluginId: string, type: string): ServiceAccountWorkloadTypeRegistration | undefined {
    return this.byPlugin.get(pluginId)?.get(type);
  }
}
