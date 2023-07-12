/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavigationEmbeddableLink, NavigationEmbeddableLinkList } from '../embeddable/types';

export const getOrderedLinkList = (
  links: NavigationEmbeddableLinkList
): NavigationEmbeddableLink[] => {
  return Object.keys(links)
    .map((linkId) => {
      return links[linkId];
    })
    .sort((linkA, linkB) => {
      return linkA.order - linkB.order;
    });
};
