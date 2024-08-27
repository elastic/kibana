/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { interfaces } from 'inversify';

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

/**
 * Plugin's setup dependency.
 */
export function PluginSetup<T>(plugin: keyof any): interfaces.ServiceIdentifier<T> {
  return Symbol.for(`plugin.setup.${String(plugin)}`);
}

/**
 * Plugin's start dependency.
 */
export function PluginStart<T>(plugin: keyof any): interfaces.ServiceIdentifier<T> {
  return Symbol.for(`plugin.start.${String(plugin)}`);
}
