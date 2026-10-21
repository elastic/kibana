/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CELL_ACTIONS_BUBBLE_CLASS } from '../components/cell_actions_bubble/cell_actions_bubble_styles';
import { GRID_CELL_SELECTOR } from './grid_navigation';

/** Set on a cell while keyboard focus is inside its content, which is then tabbable. */
export const CELL_ENTERED_ATTRIBUTE = 'data-kbn-data-grid-entered';

const TABBABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[tabindex]',
  '[contenteditable="true"]',
].join(', ');

// The tabindex an element had before the grid made it untabbable, empty if it had none.
const PREVIOUS_TABINDEX_ATTRIBUTE = 'data-kbn-data-grid-tabindex';

const isInClosedCellContent = (element: Element) => {
  const cell = element.parentElement?.closest(GRID_CELL_SELECTOR);
  return (
    cell !== null &&
    cell !== undefined &&
    !cell.hasAttribute(CELL_ENTERED_ATTRIBUTE) &&
    // The cell actions bubble is the keyboard path to the actions of the focused cell.
    element.closest(`.${CELL_ACTIONS_BUBBLE_CLASS}`) === null
  );
};

const makeUntabbable = (element: Element) => {
  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex === '-1' || !isInClosedCellContent(element)) {
    return;
  }
  element.setAttribute(PREVIOUS_TABINDEX_ATTRIBUTE, tabIndex ?? '');
  element.setAttribute('tabindex', '-1');
};

const makeUntabbableWithin = (root: Element) => {
  if (root.matches(TABBABLE_SELECTOR)) {
    makeUntabbable(root);
  }
  root.querySelectorAll(TABBABLE_SELECTOR).forEach(makeUntabbable);
};

/** Restores the tabindex of the content of a cell, so Tab moves through it, and returns its first tabbable element. */
export const enterCellContent = (cell: HTMLElement): HTMLElement | undefined => {
  cell.setAttribute(CELL_ENTERED_ATTRIBUTE, '');
  cell.querySelectorAll(`[${PREVIOUS_TABINDEX_ATTRIBUTE}]`).forEach((element) => {
    const previousTabIndex = element.getAttribute(PREVIOUS_TABINDEX_ATTRIBUTE);
    element.removeAttribute(PREVIOUS_TABINDEX_ATTRIBUTE);
    if (previousTabIndex) {
      element.setAttribute('tabindex', previousTabIndex);
    } else {
      element.removeAttribute('tabindex');
    }
  });
  return Array.from(cell.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).find(
    (element) => element.getAttribute('tabindex') !== '-1'
  );
};

/** Makes the content of a cell untabbable again. */
export const exitCellContent = (cell: HTMLElement) => {
  // The grid's observer makes the content untabbable once the attribute is gone.
  cell.removeAttribute(CELL_ENTERED_ATTRIBUTE);
};

/**
 * Keeps interactive content of cells and headers out of the tab order, so the grid stays a single
 * tab stop (like EuiDataGrid). A cell's content becomes tabbable while the cell is entered.
 */
export const observeCellContentFocus = (grid: HTMLElement): (() => void) => {
  makeUntabbableWithin(grid);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(({ type, target, addedNodes, attributeName }) => {
      if (type === 'childList') {
        addedNodes.forEach((node) => {
          if (node instanceof Element) {
            makeUntabbableWithin(node);
          }
        });
        return;
      }
      if (!(target instanceof Element)) {
        return;
      }
      if (attributeName === CELL_ENTERED_ATTRIBUTE) {
        if (!target.hasAttribute(CELL_ENTERED_ATTRIBUTE)) {
          makeUntabbableWithin(target);
        }
        return;
      }
      // Re-rendered content can reset its tabindex.
      makeUntabbable(target);
    });
  });
  observer.observe(grid, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['tabindex', CELL_ENTERED_ATTRIBUTE],
  });
  return () => observer.disconnect();
};
