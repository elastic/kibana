/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface TypeDefinition {
  castsTo: (typeName: string) => boolean;
  castsFrom: (typeName: string) => boolean;
  to: (node: unknown, typeName: string, types: Record<string, TypeDefinition>) => unknown;
  from: (node: unknown, types: Record<string, TypeDefinition>) => unknown;
}

export type CastFunction = (node: unknown, toTypeNames: string[]) => unknown;

export function castProvider(types: Record<string, TypeDefinition>): CastFunction;
