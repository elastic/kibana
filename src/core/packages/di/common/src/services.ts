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

/**
 * The service identifier for the global service references.
 */
export const Global = Symbol.for(
  'Global'
) as interfaces.ServiceIdentifier<interfaces.ServiceIdentifier>;

export const DiSetupService = Symbol.for(
  'DiSetupService'
) as interfaces.ServiceIdentifier<CoreDiServiceSetup>;

export const DiService = Symbol.for(
  'DiService'
) as interfaces.ServiceIdentifier<CoreDiServiceStart>;

/**
 * Plugin's setup contract.
 */
export const Setup = Symbol.for('Setup') as interfaces.ServiceIdentifier;

/**
 * Plugin's start contract.
 */
export const Start = Symbol.for('Start') as interfaces.ServiceIdentifier;

/**
 * Plugin's setup lifecycle hook.
 */
export const OnSetup = Symbol.for('OnSetup') as interfaces.ServiceIdentifier<
  (container: interfaces.Container) => void
>;

/**
 * Plugin's start lifecycle hook.
 */
export const OnStart = Symbol.for('OnStart') as interfaces.ServiceIdentifier<
  (container: interfaces.Container) => void
>;
