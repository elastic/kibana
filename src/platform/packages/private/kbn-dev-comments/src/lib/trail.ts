/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TRAIL_MAX_STEPS } from '../constants';
import { buildAnchor, isIgnored, isVisible, labelOf } from './anchor';
import type { CommentsLocationService, TrailStep } from '../types';

/**
 * Controls that may disclose UI or navigate: open a flyout or menu, switch
 * tabs, expand a row, follow a link. Whether a click on one did so is only
 * known afterwards (see `DISCLOSED_SELECTOR`).
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

/**
 * What a click that disclosed UI leaves behind: the control expanded or
 * selected, or a dialog, menu, listbox or tab panel that was not showing
 * before, whether it was added to the page or was already there hidden.
 * Only such clicks are recorded. A button that changed data instead (deleted,
 * acknowledged, enabled something) reveals nothing, and is never asked for.
 */
const DISCLOSED_SELECTOR = [
  '[aria-expanded="true"]',
  '[aria-selected="true"]',
  '[aria-current]:not([aria-current="false"])',
  'details[open]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="tabpanel"]',
].join(', ');

/** UI loaded on first use (a flyout fetched with its code) takes a moment to appear after the click. */
const DISCLOSURE_WAIT_MS = 500;

/** A `<button>` without `type` submits the form it is in. */
const isDefaultSubmit = (element: Element) =>
  element.tagName === 'BUTTON' && !element.hasAttribute('type') && element.closest('form') !== null;

/** Whether the element is a control a reader could be asked to click; imported trails are checked with it as well. */
export const isTrailControl = (element: Element): boolean =>
  element.matches(CONTROL_SELECTOR) &&
  !element.matches(EXCLUDED_SELECTOR) &&
  !isDefaultSubmit(element);

/** The disclosure elements showing right now; hidden ones (an inactive panel, a closed dialog kept mounted) do not count. */
const disclosed = (): ReadonlySet<Element> =>
  new Set(Array.from(document.querySelectorAll(DISCLOSED_SELECTOR)).filter(isVisible));

/** Whether something is showing now that was not `before` the click. */
const hasNewDisclosure = (before: ReadonlySet<Element>): boolean =>
  Array.from(document.querySelectorAll(DISCLOSED_SELECTOR)).some(
    (element) => !before.has(element) && isVisible(element)
  );

interface Candidate {
  control: Element;
  step: TrailStep;
  /** What was disclosed before the click. */
  before: ReadonlySet<Element>;
}

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
  location: CommentsLocationService;
  ignoreSelectors: readonly string[];
  isRecording: () => boolean;
}): TrailRecorder => {
  let steps: TrailStep[] = [];
  let pageKey = location.getPageKey();
  let unsubscribe: (() => void) | undefined;
  let candidate: Candidate | undefined;
  /** A click whose UI has not shown up yet; it gets one more look, at the latest when the next click comes in. */
  let awaited: { candidate: Candidate; timer: ReturnType<typeof setTimeout> } | undefined;

  /** Records the step if the click disclosed UI and its control is still there; false when neither is the case yet. */
  const record = ({ control, step, before }: Candidate): boolean => {
    if (!control.isConnected || !hasNewDisclosure(before)) {
      return false;
    }
    steps = [...steps, step].slice(-TRAIL_MAX_STEPS);
    return true;
  };

  const settleAwaited = ({ finalLook }: { finalLook: boolean }) => {
    if (!awaited) {
      return;
    }
    clearTimeout(awaited.timer);
    if (finalLook) {
      record(awaited.candidate);
    }
    awaited = undefined;
  };

  // The step is described before the page handles the click (labels and text can
  // change with it) and recorded after: a click that the page swallowed never
  // reaches the bubbling phase, a control that is gone by then was dismissed
  // rather than opened, and a click that disclosed nothing changed data instead.
  const onClickCapture = ({ target }: MouseEvent) => {
    candidate = undefined;
    // The previous click gets its last look before this one has had any effect
    // on the page, so that what this click discloses is not credited to it.
    settleAwaited({ finalLook: true });
    if (!isRecording() || !(target instanceof Element) || isIgnored(target, ignoreSelectors)) {
      return;
    }
    const control = target.closest(CONTROL_SELECTOR);
    if (control && isTrailControl(control)) {
      candidate = {
        control,
        step: { anchor: buildAnchor(control), label: labelOf(control) },
        before: disclosed(),
      };
    }
  };

  const onClick = () => {
    if (!candidate) {
      return;
    }
    const current = candidate;
    candidate = undefined;
    if (!record(current)) {
      awaited = {
        candidate: current,
        timer: setTimeout(() => settleAwaited({ finalLook: true }), DISCLOSURE_WAIT_MS),
      };
    }
  };

  const onLocationChange = () => {
    const next = location.getPageKey();
    if (next !== pageKey) {
      pageKey = next;
      steps = [];
      settleAwaited({ finalLook: false });
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
      settleAwaited({ finalLook: false });
    },
    steps: () => steps,
  };
};
