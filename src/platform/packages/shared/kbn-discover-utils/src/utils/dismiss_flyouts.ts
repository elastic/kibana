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
  metricGridSettings = 'metricGridSettings',
  esqlControls = 'esqlControls',
  lensAlertRule = 'lensAlertRule',
  inspectorPanel = 'inspectorPanel',
}

const AllDiscoverFlyouts = Object.values(DiscoverFlyouts);

const FlyoutRootSelectors: Record<DiscoverFlyouts, string> = {
  [DiscoverFlyouts.lensEdit]: '[data-test-subj="lnsEditOnFlyFlyout"]',
  [DiscoverFlyouts.docViewer]: '[data-test-subj="docViewerFlyout"]',
  [DiscoverFlyouts.esqlDocs]: '[data-test-subj="esqlInlineDocumentationFlyout"]',
  [DiscoverFlyouts.metricInsights]: '[data-test-subj="metricsExperienceFlyout"]',
  [DiscoverFlyouts.metricGridSettings]: '[data-test-subj="metricsExperienceGridSettingsFlyout"]',
  [DiscoverFlyouts.esqlControls]: '[data-test-subj="esqlControlsFlyout"]',
  [DiscoverFlyouts.lensAlertRule]: '[data-test-subj="lensAlertRule"]',
  [DiscoverFlyouts.inspectorPanel]: '[data-test-subj="inspectorPanel"]',
};

const getFlyoutCloseButtonGetters = (flyout: DiscoverFlyouts): Array<() => HTMLElement | null> => {
  const root = FlyoutRootSelectors[flyout];

  // The Lens edit flyout renders with `hideCloseButton`, so it has no EUI close button to click.
  if (flyout === DiscoverFlyouts.lensEdit) {
    return [
      () =>
        document.querySelector(
          `${root} [data-test-subj="lns-indexPattern-dimensionContainerBack"]`
        ),
      () => document.getElementById('lnsCancelEditOnFlyFlyout'),
    ];
  }

  return [() => document.querySelector(`${root} [data-test-subj="euiFlyoutCloseButton"]`)];
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
