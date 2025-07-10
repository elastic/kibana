/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableTransforms } from '../common';

const registry: { [key: string]: () => Promise<EmbeddableTransforms<any, any> | undefined> } = {};

export function registerTransforms(
  type: string,
  getTransformsCallback: () => Promise<EmbeddableTransforms<any, any> | undefined>
) {
  if (registry[type]) {
    throw new Error(`Embeddable transforms for type "${type}" are already registered.`);
  }

  registry[type] = getTransformsCallback;
}

export async function getTransforms(type: string) {
  return await registry[type]?.();
}

export function hasTransforms(type: string) {
  return Boolean(registry[type]);
}