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

const isAnyFlyoutOpenExceptFor = (excludedFlyout: DiscoverFlyouts): boolean =>
  AllDiscoverFlyouts.some(
    (flyout) =>
      flyout !== excludedFlyout && document.querySelector(FlyoutRootSelectors[flyout]) !== null
  );

/** Dismisses the other Discover flyouts, then opens this one once they have unmounted. */
export const openAfterDismissingOtherFlyouts = (
  excludedFlyout: DiscoverFlyouts,
  open: () => void
): void => {
  dismissAllFlyoutsExceptFor(excludedFlyout);

  // A dismissed flyout is still mounted until the next render, so this reads as open right after
  // `dismissAllFlyoutsExceptFor` and tells us whether we have to wait for it to go away.
  if (!isAnyFlyoutOpenExceptFor(excludedFlyout)) {
    open();
    return;
  }

  // Push flyouts share one inline offset on the app scroll container, which EUI captures on mount
  // and restores on unmount, so mounting on top of a closing flyout captures the outgoing offset.
  // Flyouts mounted via React state unmount on the next render (before the first frame); flyouts
  // mounted via the overlay service (Inspector, ES|QL controls) unmount asynchronously in a
  // microtask. Two frames give both paths time to clear before the new flyout mount
  requestAnimationFrame(() => requestAnimationFrame(open));
};
