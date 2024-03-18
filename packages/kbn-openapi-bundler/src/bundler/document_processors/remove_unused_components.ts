/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { hasProp } from '../../utils/has_prop';
import { isPlainObjectType } from '../../utils/is_plain_object_type';
import { PlainObjectNode, ResolvedRef } from '../types';

/**
 * Helps to remove unused components.
 *
 * To achieve it requires including in document processors list to collect encountered refs
 * and then `removeUnusedComponents()` should be invoked after document processing to perform
 * actual unused components deletion.
 */
export class RemoveUnusedComponentsProcessor {
  private refs = new Set();

  ref(node: unknown, resolvedRef: ResolvedRef): void {
    // If the reference has been inlined by one of the previous processors skip it
    if (!hasProp(node, '$ref')) {
      return;
    }

    this.refs.add(resolvedRef.pointer);
  }

  removeUnusedComponents(components: PlainObjectNode): void {
    if (!isPlainObjectType(components.schemas)) {
      return;
    }

    for (const schema of Object.keys(components.schemas)) {
      if (!this.refs.has(`/components/schemas/${schema}`)) {
        delete components.schemas[schema];
      }
    }
  }
}
