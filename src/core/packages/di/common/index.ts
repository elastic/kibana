/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { CoreDiServiceSetup, CoreDiServiceStart } from './src/contracts';
export type { ExtensionPointToken, ServiceToken } from './src/create_token';
export { getExtensions, getService, injectExtensions, injectService } from './src/resolve_tokens';
export { Logger, LoggerFactory } from './src/services/logging';
export { OnSetup, OnStart, PluginSetup, PluginStart, Setup, Start } from './src/services/plugin';
export { inject, injectable, multiInject } from 'inversify';
export type { Container, ServiceIdentifier } from 'inversify';
