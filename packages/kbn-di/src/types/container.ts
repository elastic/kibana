/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceIdentifier } from './service';
import type { ServiceRegistration } from './service_registration';

export interface InjectionContainer<Ctx = unknown> {
  getId(): string;

  isRoot(): boolean;

  getParent(): InjectionContainer | undefined;

  getContext(): Ctx;

  createChild<ChildCtx = unknown>(
    options: CreateChildOptions<ChildCtx>
  ): InjectionContainer<ChildCtx>;

  get<T = unknown>(identifier: ServiceIdentifier<T>): T;

  register<T = unknown>(registration: ServiceRegistration<T>): void;
}

export interface CreateChildOptions<Ctx = unknown> {
  id: string;
  context: Ctx;
}
