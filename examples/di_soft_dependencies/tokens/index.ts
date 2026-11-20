/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createToken } from '@kbn/core-di';

/** A service one lookup plugin exposes and the other one uses when it is enabled. */
export interface Greeter {
  greet(): string;
}

/** The greeter exposed by `diSoftDepsLookupA`. */
export const LookupAGreeter = createToken<Greeter>('diSoftDepsLookupA.Greeter');

/** The greeter exposed by `diSoftDepsLookupB`. */
export const LookupBGreeter = createToken<Greeter>('diSoftDepsLookupB.Greeter');

/** An entry any plugin, the registry owner included, contributes to a registry. */
export interface RegistryEntry {
  id: string;
  label: string;
}

/** Entries collected by `diSoftDepsRegistryA`. */
export const RegistryAEntry = createToken<RegistryEntry>('diSoftDepsRegistryA.Entry');

/** Entries collected by `diSoftDepsRegistryB`. */
export const RegistryBEntry = createToken<RegistryEntry>('diSoftDepsRegistryB.Entry');
