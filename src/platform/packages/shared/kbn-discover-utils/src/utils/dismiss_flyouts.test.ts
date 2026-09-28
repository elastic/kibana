/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DiscoverFlyouts, openAfterDismissingOtherFlyouts } from './dismiss_flyouts';

const FLYOUT_TEST_SUBJS: Record<string, string> = {
  [DiscoverFlyouts.metricInsights]: 'metricsExperienceFlyout',
  [DiscoverFlyouts.inspectorPanel]: 'inspectorPanel',
  [DiscoverFlyouts.lensEdit]: 'lnsEditOnFlyFlyout',
};

const afterFrames = (frames: number, fn: () => void) =>
  frames <= 0 ? fn() : requestAnimationFrame(() => afterFrames(frames - 1, fn));

// Mounts a flyout that unmounts a few frames after its close button is clicked, covering the
// slowest path we have to wait for: flyouts owned by the overlay service.
const mountFlyout = (flyout: DiscoverFlyouts) => {
  const root = document.createElement('div');
  root.dataset.testSubj = FLYOUT_TEST_SUBJS[flyout];

  const closeButton = document.createElement('button');
  // The Lens edit flyout renders with `hideCloseButton`, so it has no `euiFlyoutCloseButton`.
  if (flyout === DiscoverFlyouts.lensEdit) {
    closeButton.id = 'lnsCancelEditOnFlyFlyout';
  } else {
    closeButton.dataset.testSubj = 'euiFlyoutCloseButton';
  }
  closeButton.addEventListener('click', () => afterFrames(3, () => root.remove()));

  root.appendChild(closeButton);
  document.body.appendChild(root);
};

const flushFrames = async () => {
  for (let i = 0; i < 3; i++) {
    await new Promise(requestAnimationFrame);
  }
};

describe('openAfterDismissingOtherFlyouts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens right away when no other flyout is mounted', () => {
    const open = jest.fn();

    openAfterDismissingOtherFlyouts(DiscoverFlyouts.metricInsights, open);

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('waits for a dismissed flyout to unmount before opening', async () => {
    mountFlyout(DiscoverFlyouts.inspectorPanel);
    const open = jest.fn();

    openAfterDismissingOtherFlyouts(DiscoverFlyouts.metricInsights, open);

    expect(open).not.toHaveBeenCalled();

    await flushFrames();

    expect(open).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-test-subj="inspectorPanel"]')).toBeNull();
  });

  it('waits for a dismissed flyout that hides the EUI close button', async () => {
    mountFlyout(DiscoverFlyouts.lensEdit);
    const open = jest.fn();

    openAfterDismissingOtherFlyouts(DiscoverFlyouts.metricInsights, open);

    expect(open).not.toHaveBeenCalled();

    await flushFrames();

    expect(open).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-test-subj="lnsEditOnFlyFlyout"]')).toBeNull();
  });

  it('opens right away when only the excluded flyout is mounted', () => {
    mountFlyout(DiscoverFlyouts.metricInsights);
    const open = jest.fn();

    openAfterDismissingOtherFlyouts(DiscoverFlyouts.metricInsights, open);

    expect(open).toHaveBeenCalledTimes(1);
  });
});
