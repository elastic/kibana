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
  metricInsights = 'metricInsights',
  esqlControls = 'esqlControls',
  lensAlertRule = 'lensAlertRule',
  inspectorPanel = 'inspectorPanel',
}

const AllDiscoverFlyouts = Object.values(DiscoverFlyouts);

const getFlyoutCloseButtonGetters = (flyout: DiscoverFlyouts): Array<() => HTMLElement | null> => {
  switch (flyout) {
    case DiscoverFlyouts.lensEdit:
      return [
        () =>
          document.querySelector(
            '[data-test-subj="lnsEditOnFlyFlyout"] [data-test-subj="lns-indexPattern-dimensionContainerBack"]'
          ),
        () => document.getElementById('lnsCancelEditOnFlyFlyout'),
      ];
    case DiscoverFlyouts.docViewer:
      return [
        () =>
          document.querySelector(
            '[data-test-subj="docViewerFlyout"] [data-test-subj="euiFlyoutCloseButton"]'
          ),
      ];
    case DiscoverFlyouts.esqlDocs:
      return [
        () =>
          document.querySelector(
            '[data-test-subj="esqlInlineDocumentationFlyout"] [data-test-subj="euiFlyoutCloseButton"]'
          ),
      ];
    case DiscoverFlyouts.metricInsights:
      return [
        () =>
          document.querySelector(
            '[data-test-subj="metricsExperienceFlyout"] [data-test-subj="euiFlyoutCloseButton"]'
          ),
      ];
    case DiscoverFlyouts.esqlControls:
      return [
        () =>
          document.querySelector(
            '[data-test-subj="esqlControlsFlyout"] [data-test-subj="euiFlyoutCloseButton"]'
          ),
      ];
    case DiscoverFlyouts.lensAlertRule:
      return [
        () =>
          document.querySelector(
            '[data-test-subj="lensAlertRule"] [data-test-subj="euiFlyoutCloseButton"]'
          ),
      ];
    case DiscoverFlyouts.inspectorPanel:
      return [
        () =>
          document.querySelector(
            '[data-test-subj="inspectorPanel"] [data-test-subj="euiFlyoutCloseButton"]'
          ),
      ];
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
    const closeButtonGetters = getFlyoutCloseButtonGetters(flyout);
    closeButtonGetters.forEach((getCloseButton) => {
      const closeButton = getCloseButton();
      closeButton?.click();
    });
  });
};

export const dismissAllFlyoutsExceptFor = (excludedFlyout: DiscoverFlyouts) => {
  dismissFlyouts(AllDiscoverFlyouts, excludedFlyout);
};
