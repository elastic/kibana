/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { type ActiveMigrations } from './types';
/**
 * Converts migrations from a format that is convenient for callers to a format that
 * is convenient for our internal usage:
 * From: { type: { version: fn } }
 * To:   { type: { latestVersion?: Record<TransformType, string>; transforms: [{ version: string, transform: fn }] } }
 */
export declare function buildActiveMigrations({
  typeRegistry,
  kibanaVersion,
  convertVersion,
  log,
}: {
  typeRegistry: ISavedObjectTypeRegistry;
  kibanaVersion: string;
  convertVersion?: string;
  log: Logger;
}): ActiveMigrations;
