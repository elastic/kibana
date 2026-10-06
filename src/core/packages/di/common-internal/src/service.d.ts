/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Container } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { InternalCoreDiServiceSetup, InternalCoreDiServiceStart } from './contracts';
/** @internal */
export declare class CoreInjectionService {
  private static readonly DEFAULT_CONTAINER_OPTIONS;
  private root;
  private module;
  constructor();
  protected getContainer(id?: PluginOpaqueId, container?: Container): Container;
  protected fork(id?: PluginOpaqueId, container?: Container): Container;
  setup(): InternalCoreDiServiceSetup;
  start(): InternalCoreDiServiceStart;
}
