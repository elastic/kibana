/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableTransforms } from '../common';

const registry: {
  [key: string]: () => Promise<EmbeddableTransforms['transformOut']>;
} = {};

export function registerLegacyURLTransform(
  type: string,
  getTransformOut: () => Promise<EmbeddableTransforms['transformOut']>
) {
  if (registry[type]) {
    throw new Error(`Embeddable legacy URL transform for type "${type}" is already registered.`);
  }

  registry[type] = getTransformOut;
}

export async function getLegacyURLTransform(type: string) {
  return await registry[type]?.();
}

export function hasLegacyURLTransform(type: string) {
  return Boolean(registry[type]);
}
