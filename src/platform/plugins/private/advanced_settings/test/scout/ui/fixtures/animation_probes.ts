/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

// essential animations and drag-and-drop elements are exempt from the disable-animations setting
export const ANIMATION_EXEMPTIONS = [
  'essentialAnimation',
  'data-rbd-draggable-context-id',
  'data-rbd-droppable-context-id',
  'data-rfd-draggable-context-id',
  'data-rfd-droppable-context-id',
] as const;

/** Adds controlled elements to observe the page's animation settings. */
export const addAnimationProbes = async (page: ScoutPage): Promise<void> => {
  await page.evaluate((exemptions) => {
    const style = document.createElement('style');
    style.textContent =
      '@keyframes scoutAnimationProbe { from { opacity: 0; } to { opacity: 1; } }';
    document.head.appendChild(style);

    for (const name of ['normal', ...exemptions]) {
      const probe = document.createElement('div');
      probe.setAttribute('data-test-subj', `animation-probe-${name}`);
      probe.style.animationDuration = '1s';
      probe.style.transitionDuration = '1s';
      probe.style.transitionDelay = '1s';
      if (name === 'essentialAnimation') {
        probe.className = name;
      } else if (name !== 'normal') {
        probe.setAttribute(name, 'probe');
      }
      document.body.appendChild(probe);
    }
  }, ANIMATION_EXEMPTIONS);
};

/** Starts an animation and records whether its completion event fires. */
export const startAnimationProbe = async (page: ScoutPage): Promise<void> => {
  await page.testSubj.locator('animation-probe-normal').evaluate((probe) => {
    probe.addEventListener(
      'animationend',
      () => probe.setAttribute('data-animation-ended', 'true'),
      {
        once: true,
      }
    );
    probe.style.animationName = 'scoutAnimationProbe';
  });
};
