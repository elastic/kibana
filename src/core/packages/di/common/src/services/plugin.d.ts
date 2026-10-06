/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Container } from 'inversify';
import type { ServiceToken } from '../token';
/**
 * Plugin's setup contract.
 * @public
 */
export declare const Setup: ServiceToken<unknown>;
/**
 * Plugin's start contract.
 * @public
 */
export declare const Start: ServiceToken<unknown>;
/**
 * Plugin's setup lifecycle hook.
 * @public
 */
export declare const OnSetup: ServiceToken<(container: Container) => void>;
/**
 * Plugin's start lifecycle hook.
 * @public
 */
export declare const OnStart: ServiceToken<(container: Container) => void>;
/**
 * Plugin's setup dependency.
 * @param plugin The dependency plugin name.
 * @public
 */
export declare function PluginSetup<T>(plugin: keyof any): ServiceToken<T>;
/**
 * Plugin's start dependency.
 * @param plugin The dependency plugin name.
 * @public
 */
export declare function PluginStart<T>(plugin: keyof any): ServiceToken<T>;
