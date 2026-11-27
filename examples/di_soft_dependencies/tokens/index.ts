/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createExtensionPoint } from '@kbn/core-di';

/** A service one lookup plugin contributes and the other one uses when it is enabled. */
export interface Greeter {
  greet(): string;
}

/** The greeter contributed by `diSoftDepsLookupA`. */
export const LookupAGreeter = createExtensionPoint<Greeter>('diSoftDepsLookupA.Greeter');

/** The greeter contributed by `diSoftDepsLookupB`. */
export const LookupBGreeter = createExtensionPoint<Greeter>('diSoftDepsLookupB.Greeter');

/** A greeter built for the current request, so it can greet the caller. */
export interface RequestGreeter {
  greet(): string;
}

/** The request-scoped greeter contributed by `diSoftDepsLookupB` on the server. */
export const LookupBRequestGreeter = createExtensionPoint<RequestGreeter>(
  'diSoftDepsLookupB.RequestGreeter'
);

/** An entry any plugin, the registry owner included, contributes to a registry. */
export interface RegistryEntry {
  id: string;
  label: string;
}

/** Entries collected by `diSoftDepsRegistryA`. */
export const RegistryAEntry = createExtensionPoint<RegistryEntry>('diSoftDepsRegistryA.Entry');

/** Entries collected by `diSoftDepsRegistryB`. */
export const RegistryBEntry = createExtensionPoint<RegistryEntry>('diSoftDepsRegistryB.Entry');
