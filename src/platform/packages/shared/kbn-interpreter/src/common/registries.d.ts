/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface RegistryLike {
  register: (item: unknown) => void;
}

export type Registries = Record<string, RegistryLike>;

export function addRegistries<T extends Registries>(registries: T, newRegistries: Registries): T;

export function register<T extends Registries>(registries: T, specs: Record<string, unknown[]>): T;

export interface RegistryFactoryResult<T extends Registries> {
  registries(): T;
  register(specs: Record<string, unknown[]>): T;
}

export function registryFactory<T extends Registries>(registries: T): RegistryFactoryResult<T>;
