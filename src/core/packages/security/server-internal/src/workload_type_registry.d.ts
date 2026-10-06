/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceAccountWorkloadTypeRegistration } from '@kbn/core-security-server';
/**
 * The workload types plugins have registered, keyed by plugin.
 */
export declare class WorkloadTypeRegistry {
  private readonly byPlugin;
  /**
   * Records a workload type for a plugin. Throws on an invalid type, name or description, and
   * when the plugin has already registered that type.
   */
  register(pluginId: string, registration: ServiceAccountWorkloadTypeRegistration): void;
  isRegistered(pluginId: string, type: string): boolean;
  get(pluginId: string, type: string): ServiceAccountWorkloadTypeRegistration | undefined;
}
