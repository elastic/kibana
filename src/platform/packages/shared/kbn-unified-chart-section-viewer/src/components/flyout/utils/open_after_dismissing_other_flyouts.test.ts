/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DiscoverFlyouts } from '@kbn/discover-utils';
import { openAfterDismissingOtherFlyouts } from './open_after_dismissing_other_flyouts';

const FLYOUT_TEST_SUBJS: Record<string, string> = {
  [DiscoverFlyouts.metricInsights]: 'metricsExperienceFlyout',
  [DiscoverFlyouts.inspectorPanel]: 'inspectorPanel',
};

// Mounts a flyout that, like EUI, unmounts on the render after its close button is clicked.
const mountFlyout = (flyout: DiscoverFlyouts) => {
  const root = document.createElement('div');
  root.dataset.testSubj = FLYOUT_TEST_SUBJS[flyout];

  const closeButton = document.createElement('button');
  closeButton.dataset.testSubj = 'euiFlyoutCloseButton';
  closeButton.addEventListener('click', () => {
    requestAnimationFrame(() => root.remove());
  });

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
});
