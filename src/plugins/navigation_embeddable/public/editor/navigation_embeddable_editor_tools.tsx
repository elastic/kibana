/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { memoize } from 'lodash';
import {
  NavigationEmbeddableLink,
  NavigationEmbeddableLinkList,
} from '../../common/content_management';

const getOrderedLinkList = (links: NavigationEmbeddableLinkList): NavigationEmbeddableLink[] => {
  return Object.keys(links)
    .map((linkId) => {
      return links[linkId];
    })
    .sort((linkA, linkB) => {
      return linkA.order - linkB.order;
    });
};

/**
 * Memoizing this prevents the navigation embeddable panel editor from having to unnecessarily calculate this
 * a second time once the embeddable exists - after all, the navigation embeddable component should have already
 * calculated this so, we can get away with using the cached version in the editor
 */
export const memoizedGetOrderedLinkList = memoize(
  (links: NavigationEmbeddableLinkList) => {
    return getOrderedLinkList(links);
  },
  (links: NavigationEmbeddableLinkList) => {
    return links;
  }
);
