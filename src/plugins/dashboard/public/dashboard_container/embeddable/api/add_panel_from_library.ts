/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isErrorEmbeddable, openAddFromLibraryFlyout } from '@kbn/embeddable-plugin/public';
import { DashboardContainer } from '../dashboard_container';

export function addFromLibrary(this: DashboardContainer) {
  if (isErrorEmbeddable(this)) return;
  this.openOverlay(
    openAddFromLibraryFlyout({
      container: this,
      onAddPanel: (id: string) => {
        this.setScrollToPanelId(id);
        this.setHighlightPanelId(id);
      },
      onClose: () => {
        this.clearOverlays();
      },
    })
  );
}
