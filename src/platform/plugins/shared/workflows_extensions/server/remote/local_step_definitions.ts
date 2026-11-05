/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { ServerStepRegistry } from '../step_registry/step_registry';
import type { ServerStepDefinition } from '../step_registry/types';
import { registerInternalStepDefinitions } from '../steps';

let registry: ServerStepRegistry | undefined;

const silentLogger = (): Logger => {
  const logger = {
    debug() {},
    info() {},
    warn() {},
    error() {},
    trace() {},
    fatal() {},
    log() {},
    isLevelEnabled: () => false,
    get: () => logger,
  };
  return logger as unknown as Logger;
};

/**
 * Pure built-in step definitions that are safe to execute inside a remote worker: they only use
 * the engine-provided step context and never touch Kibana services. Built lazily on first lookup
 * so an executor that runs no such step pays no initialization cost.
 */
export function getLocalStepDefinition(
  stepType: string,
  logger: Logger = silentLogger()
): ServerStepDefinition | undefined {
  if (!registry) {
    registry = new ServerStepRegistry(logger);
    registerInternalStepDefinitions(registry);
  }
  return registry.get(stepType);
}
