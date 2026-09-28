/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import { apiIsPresentationContainer } from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { VegaEmbeddableApi } from './vega_embeddable';

export const openVegaEditor = ({
  core,
  parentApi,
  returnFocus,
  focusedPanelId,
  loadApi,
  isNewPanel = false,
}: {
  core: CoreStart;
  parentApi?: unknown;
  returnFocus?: () => void;
  focusedPanelId?: string;
  loadApi: () => Promise<VegaEmbeddableApi | undefined>;
  isNewPanel?: boolean;
}) => {
  let closed = false;

  const flyoutRef = openLazyFlyout({
    core,
    parentApi,
    returnFocus,
    flyoutProps: {
      focusedPanelId,
      size: 'm',
      // A stray click would otherwise revert unsaved spec edits.
      outsideClickCloses: false,
    },
    loadContent: async ({ ariaLabelledBy, closeFlyout }) => {
      const api = await loadApi();
      if (!api) return;

      if (closed) {
        if (isNewPanel && apiIsPresentationContainer(parentApi)) {
          parentApi.removePanel(api.uuid);
        }
        return;
      }

      return api.getEditPanel?.({ ariaLabelledBy, closeFlyout, isNewPanel });
    },
  });

  void flyoutRef.onClose.then(() => {
    closed = true;
  });

  return flyoutRef;
};
