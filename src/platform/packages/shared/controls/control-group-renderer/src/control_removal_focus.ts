/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { focusFirstFocusable, getRemovalFocusTarget } from '@kbn/presentation-util';
import type { ControlsLayout } from '@kbn/controls-renderer';

export const getControlIdsInOrder = (layout: ControlsLayout): string[] =>
  Object.entries(layout.controls)
    .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
    .map(([id]) => id);

export const restoreFocusAfterControlRemoval = (
  layout: ControlsLayout,
  removedControlId: string,
  getFallback: () => Element | null
) => {
  const focusTargetControlId = getRemovalFocusTarget(
    getControlIdsInOrder(layout),
    removedControlId
  );

  focusFirstFocusable(() => {
    if (!focusTargetControlId) {
      return getFallback();
    }

    return document.getElementById(`panel-${focusTargetControlId}`) ?? getFallback();
  });
};
