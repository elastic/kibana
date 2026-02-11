/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Updates the tab indices for a given set of elements.
 *
 * @param elements - the elements to update the tab indices for.
 */
export const updateTabIndices = (elements: HTMLElement[]) => {
  elements.forEach((el, idx) => {
    el.tabIndex = idx === 0 ? 0 : -1;
  });
};
