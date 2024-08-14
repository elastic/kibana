/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { interfaces } from 'inversify';
import type { CoreDiServiceSetup, CoreDiServiceStart } from './contracts';

type Lifecycle = 'setup' | 'start';

export interface GlobalServiceWithOptions {
  /**
   * The name of the service to be exposed in the lifecycle contracts.
   */
  name?: string;

  /**
   * Target service identifier.
   */
  service: interfaces.ServiceIdentifier<unknown>;

  /**
   * The stage of the lifecycle where the service should be exposed.
   */
  stage?: Lifecycle;
}

export type GlobalService = GlobalServiceWithOptions | GlobalServiceWithOptions['service'];

/**
 * The service identifier for the global service references.
 */
export const Global = Symbol.for('Global') as interfaces.ServiceIdentifier<GlobalService>;

export const DiSetupService = Symbol.for(
  'DiSetupService'
) as interfaces.ServiceIdentifier<CoreDiServiceSetup>;

export const DiService = Symbol.for(
  'DiService'
) as interfaces.ServiceIdentifier<CoreDiServiceStart>;

/**
 * Plugin's setup contract.
 */
export const Setup = Symbol.for('Setup') as interfaces.ServiceIdentifier<Record<string, unknown>>;

/**
 * Plugin's start contract.
 */
export const Start = Symbol.for('Start') as interfaces.ServiceIdentifier<Record<string, unknown>>;
