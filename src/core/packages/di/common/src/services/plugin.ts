/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Container } from 'inversify';
import { createToken } from '../token';
import type { ServiceToken } from '../token';

/**
 * Plugin's setup contract.
 * @public
 */
export const Setup = createToken('Setup');

/**
 * Plugin's start contract.
 * @public
 */
export const Start = createToken('Start');

/**
 * Plugin's setup lifecycle hook.
 * @public
 */
export const OnSetup = createToken<(container: Container) => void>('OnSetup');

/**
 * Plugin's start lifecycle hook.
 * @public
 */
export const OnStart = createToken<(container: Container) => void>('OnStart');

/**
 * Plugin's setup dependency.
 * @param plugin The dependency plugin name.
 * @public
 */
export function PluginSetup<T>(plugin: keyof any): ServiceToken<T> {
  return createToken<T>(`plugin.setup.${String(plugin)}`);
}

/**
 * Plugin's start dependency.
 * @param plugin The dependency plugin name.
 * @public
 */
export function PluginStart<T>(plugin: keyof any): ServiceToken<T> {
  return createToken<T>(`plugin.start.${String(plugin)}`);
}
