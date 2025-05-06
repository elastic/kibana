/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Container, ServiceIdentifier } from 'inversify';

/**
 * The service identifier for the global service references.
 * @public
 */
export const Global = Symbol.for('Global') as ServiceIdentifier<ServiceIdentifier>;

/**
 * Plugin's setup contract.
 * @public
 */
export const Setup = Symbol.for('Setup') as ServiceIdentifier;

/**
 * Plugin's start contract.
 * @public
 */
export const Start = Symbol.for('Start') as ServiceIdentifier;

/**
 * Plugin's setup lifecycle hook.
 * @public
 */
export const OnSetup = Symbol.for('OnSetup') as ServiceIdentifier<(container: Container) => void>;

/**
 * Plugin's start lifecycle hook.
 * @public
 */
export const OnStart = Symbol.for('OnStart') as ServiceIdentifier<(container: Container) => void>;

/**
 * Plugin's setup dependency.
 * @param plugin The dependency plugin name.
 * @public
 */
export function PluginSetup<T>(plugin: keyof any): ServiceIdentifier<T> {
  return Symbol.for(`plugin.setup.${String(plugin)}`);
}

/**
 * Plugin's start dependency.
 * @param plugin The dependency plugin name.
 * @public
 */
export function PluginStart<T>(plugin: keyof any): ServiceIdentifier<T> {
  return Symbol.for(`plugin.start.${String(plugin)}`);
}
