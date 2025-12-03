/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicStepDefinition } from './step_registry/types';
import type {
  WorkflowsExtensionsSetupContract,
  WorkflowsExtensionsStartContract,
} from '../common/types';

/**
 * Public-side plugin setup contract.
 * Exposes methods for other plugins to register public-side step definition.
 */
export type WorkflowsExtensionsPublicPluginSetup =
  WorkflowsExtensionsSetupContract<PublicStepDefinition>;

/**
 * Public-side plugin start contract.
 * Exposes methods for retrieving registered public-side step definition.
 */
export type WorkflowsExtensionsPublicPluginStart =
  WorkflowsExtensionsStartContract<PublicStepDefinition>;

/**
 * Dependencies for the public plugin setup phase.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsPublicPluginSetupDeps {}

/**
 * Dependencies for the public plugin start phase.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsPublicPluginStartDeps {}
