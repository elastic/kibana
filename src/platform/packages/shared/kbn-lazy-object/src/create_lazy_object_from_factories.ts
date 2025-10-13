/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  annotateLazy,
  createLazyObjectFromAnnotations,
} from './create_lazy_object_from_annotations';
import { isLazyObjectDisabled } from './is_disabled';

const DISABLED = isLazyObjectDisabled();

export function createLazyObjectFromFactories<TFactories extends Record<string, () => any>>(
  factories: TFactories
): { [K in keyof TFactories]: ReturnType<TFactories[K]> } {
  if (DISABLED) {
    // Evaluate all factories eagerly
    const eager: Record<string, unknown> = {};
    for (const key of Object.keys(factories)) {
      eager[key] = factories[key]();
    }
    return eager as { [K in keyof TFactories]: ReturnType<TFactories[K]> };
  }

  // Build an annotated object where each property value is the factory annotated as lazy
  const annotated: Record<string, unknown> = {};
  for (const key of Object.keys(factories)) {
    annotated[key] = annotateLazy(factories[key]);
  }
  // Delegate to the annotations-based runtime so behavior stays in one place
  // and metrics increment occurs there on access.
  return createLazyObjectFromAnnotations(
    annotated as unknown as { [K in keyof TFactories]: ReturnType<TFactories[K]> }
  );
}
