/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useSyncExternalStore } from 'react';
import type { ChildVirtualizerController } from './child_virtualizer_controller';

const NOOP_SUBSCRIBE = () => () => {};
const ALWAYS_ACTIVE = () => true;

/**
 * Opt-in hook that pre-registers a row cell with the child virtualizer
 * controller and returns whether the cell's heavy content should mount.
 *
 * Use this in consumer components that render expensive children (e.g.
 * a full data grid) to defer their mount until the controller's staggered
 * activation loop reaches this row.  Components that don't need stagger
 * gating should skip this hook entirely — their content will mount
 * immediately.
 */
export const useChildVirtualizerActivation = ({
  controller,
  cellId,
  rowIndex,
}: {
  controller: ChildVirtualizerController | null;
  cellId: string;
  rowIndex: number;
}): boolean => {
  useEffect(() => {
    if (controller) {
      return controller.enqueue(cellId, rowIndex);
    }
  }, [controller, cellId, rowIndex]);

  return useSyncExternalStore(
    controller ? controller.subscribe : NOOP_SUBSCRIBE,
    controller ? () => controller.shouldActivate(rowIndex) : ALWAYS_ACTIVE,
    () => false
  );
};
