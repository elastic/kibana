/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** An argument that gets its suggestions from its own provider, until the engine covers it. */
export interface ProviderOverride {
  /** The team that owns the override. */
  readonly owner: string;
  /** The issue that tracks its removal. */
  readonly issue: string;
  /** What the engine or the command signatures need before the override can go. */
  readonly waitingFor: string;
}

/** The provider overrides, by argument id. */
export const PROVIDER_OVERRIDES: Readonly<Record<string, ProviderOverride>> = {};
