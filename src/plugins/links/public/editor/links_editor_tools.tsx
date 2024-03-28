/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { memoize } from 'lodash';
import { Link } from '../../common/content_management';

const getOrderedLinkList = (links: Link[]): Link[] => {
  return [...links].sort((linkA, linkB) => {
    return linkA.order - linkB.order;
  });
};

/**
 * Memoizing this prevents the links panel editor from having to unnecessarily calculate this
 * a second time once the embeddable exists - after all, the links component should have already
 * calculated this so, we can get away with using the cached version in the editor
 */
export const memoizedGetOrderedLinkList = memoize(
  (links: Link[]) => {
    return getOrderedLinkList(links);
  },
  (links: Link[]) => {
    return links;
  }
);

/**
 * Return focus to the main flyout div to align with a11y standards
 * @param flyoutId ID of the main flyout div element
 */
export const focusMainFlyout = (flyoutId: string) => {
  const flyoutElement = document.getElementById(flyoutId);
  if (flyoutElement) {
    flyoutElement.focus();
  }
};
