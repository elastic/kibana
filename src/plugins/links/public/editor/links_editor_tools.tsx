/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { memoize } from 'lodash';
import { LinksLink } from '../../common/content_management';

const getOrderedLinkList = (links: LinksLink[]): LinksLink[] => {
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
  (links: LinksLink[]) => {
    return getOrderedLinkList(links);
  },
  (links: LinksLink[]) => {
    return links;
  }
);
