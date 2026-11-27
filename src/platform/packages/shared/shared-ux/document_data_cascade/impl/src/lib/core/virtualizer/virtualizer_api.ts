/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CascadeVirtualizerApi, VirtualizerInstanceType } from './types';

/** Exposes live measurements without copying the virtualizer's mutable state. */
export const createVirtualizerApi = (instance: VirtualizerInstanceType): CascadeVirtualizerApi => ({
  get scrollOffset() {
    return instance.scrollOffset;
  },
  get range() {
    return instance.range;
  },
  get measurementsCache() {
    return instance.measurementsCache;
  },
  get isScrolling() {
    return instance.isScrolling;
  },
  get scrollElement() {
    return instance.scrollElement;
  },
  get scrollRect() {
    return instance.scrollRect;
  },
  getTotalSize: instance.getTotalSize.bind(instance),
  getVirtualItems: instance.getVirtualItems.bind(instance),
  measureElement: instance.measureElement.bind(instance),
  scrollToIndex: instance.scrollToIndex.bind(instance),
  scrollToOffset: instance.scrollToOffset.bind(instance),
  cancelScroll: instance.cancelScroll.bind(instance),
  measure: instance.measure.bind(instance),
  takeSnapshot: instance.takeSnapshot.bind(instance),
  scrollToVirtualizedIndex: (offset, { adjustments = 0, behavior } = {}) =>
    instance.scrollToOffset(offset + adjustments, { behavior }),
});
