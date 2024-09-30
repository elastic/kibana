/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum DiscoverFlyouts {
  lensEdit = 'lensEdit',
  docViewer = 'docViewer',
  esqlDocs = 'esqlDocs',
}

const AllDiscoverFlyouts = Object.values(DiscoverFlyouts);

const getFlyoutCloseButton = (flyout: DiscoverFlyouts): HTMLElement | null => {
  switch (flyout) {
    case DiscoverFlyouts.lensEdit:
      return document.getElementById('lnsCancelEditOnFlyFlyout');
    case DiscoverFlyouts.docViewer:
      return document.querySelector('[data-test-subj="docViewerFlyoutCloseButton"]');
    case DiscoverFlyouts.esqlDocs:
      return document.querySelector(
        '[data-test-subj="esqlInlineDocumentationFlyout"] [data-test-subj="euiFlyoutCloseButton"]'
      );
  }
};

export const dismissFlyouts = (
  selectedFlyouts: DiscoverFlyouts[] = AllDiscoverFlyouts,
  excludedFlyout?: DiscoverFlyouts
) => {
  selectedFlyouts.forEach((flyout) => {
    if (flyout === excludedFlyout) {
      return;
    }
    const closeButton = getFlyoutCloseButton(flyout);
    if (closeButton) {
      closeButton.click?.();
    }
  });
};

export const dismissAllFlyoutsExceptFor = (excludedFlyout: DiscoverFlyouts) => {
  dismissFlyouts(AllDiscoverFlyouts, excludedFlyout);
};
