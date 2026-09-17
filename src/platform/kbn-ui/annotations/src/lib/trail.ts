/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TRAIL_MAX_STEPS } from '../constants';
import { buildAnchor, isIgnored, labelOf } from './anchor';
import type { AnnotationsLocationService, TrailStep } from '../types';

/**
 * Controls whose activation discloses UI or navigates: open a flyout or menu,
 * switch tabs, expand a row, follow a link. A reader can repeat those without
 * changing any data, which is why only they make it into a trail.
 */
const CONTROL_SELECTOR = [
  'a[href]',
  'button:not([type="submit"]):not([type="reset"])',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="treeitem"]',
].join(', ');

/** Selection and form controls: repeating a click on them changes state rather than revealing UI. */
const EXCLUDED_SELECTOR = [
  'input',
  'select',
  'textarea',
  'label',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="option"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="combobox"]',
  '[role="gridcell"]',
].join(', ');

/** A `<button>` without `type` submits the form it is in. */
const isDefaultSubmit = (element: Element) =>
  element.tagName === 'BUTTON' && !element.hasAttribute('type') && element.closest('form') !== null;

/** Whether repeating a click on the element is safe enough to ask a reader for it; imported trails are checked with it as well. */
export const isTrailControl = (element: Element): boolean =>
  element.matches(CONTROL_SELECTOR) &&
  !element.matches(EXCLUDED_SELECTOR) &&
  !isDefaultSubmit(element);

export interface TrailRecorder {
  start(): void;
  stop(): void;
  /** Clicks made on the current page so far, oldest first. */
  steps(): TrailStep[];
}

/** Passively records which disclosure controls are clicked on the current page, so "Take me there" can ask a reader to repeat them. */
export const createTrailRecorder = ({
  location,
  ignoreSelectors,
  isRecording,
}: {
  location: AnnotationsLocationService;
  ignoreSelectors: readonly string[];
  isRecording: () => boolean;
}): TrailRecorder => {
  let steps: TrailStep[] = [];
  let pageKey = location.getPageKey();
  let unsubscribe: (() => void) | undefined;
  let candidate: { control: Element; step: TrailStep } | undefined;

  // The step is described before the page handles the click (labels and text can
  // change with it) and recorded after: a click that the page swallowed never
  // reaches the bubbling phase, and a control that is gone by then was dismissed
  // rather than opened, so there is nothing to repeat.
  const onClickCapture = ({ target }: MouseEvent) => {
    candidate = undefined;
    if (!isRecording() || !(target instanceof Element) || isIgnored(target, ignoreSelectors)) {
      return;
    }
    const control = target.closest(CONTROL_SELECTOR);
    if (control && isTrailControl(control)) {
      candidate = { control, step: { anchor: buildAnchor(control), label: labelOf(control) } };
    }
  };

  const onClick = () => {
    if (!candidate) {
      return;
    }
    const { control, step } = candidate;
    candidate = undefined;
    if (control.isConnected) {
      steps = [...steps, step].slice(-TRAIL_MAX_STEPS);
    }
  };

  const onLocationChange = () => {
    const next = location.getPageKey();
    if (next !== pageKey) {
      pageKey = next;
      steps = [];
    }
  };

  return {
    start() {
      if (unsubscribe) {
        return;
      }
      document.addEventListener('click', onClickCapture, true);
      document.addEventListener('click', onClick);
      unsubscribe = location.subscribe(onLocationChange);
    },
    stop() {
      document.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('click', onClick);
      unsubscribe?.();
      unsubscribe = undefined;
      candidate = undefined;
    },
    steps: () => steps,
  };
};
