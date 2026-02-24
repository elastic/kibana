/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChromeBreadcrumbsAppendExtension } from '@kbn/core-chrome-browser';
import { createBreadcrumbsState } from './breadcrumbs_state';

const createExtension = (): ChromeBreadcrumbsAppendExtension => ({
  content: () => () => undefined,
});

const getBadgesContent = (extensions: ChromeBreadcrumbsAppendExtension[]) => {
  const badgesExtension = extensions[extensions.length - 1];
  expect(badgesExtension).toBeDefined();
  return badgesExtension.content;
};

describe('createBreadcrumbsState', () => {
  it('keeps badges content stable when only non-badge extensions change', () => {
    const state = createBreadcrumbsState();
    const emissions: ChromeBreadcrumbsAppendExtension[][] = [];
    const subscription = state.breadcrumbsAppendExtensionsWithBadges$.subscribe((extensions) => {
      emissions.push(extensions);
    });

    try {
      state.breadcrumbsAppendExtensions.set([createExtension()]);
      state.breadcrumbsBadges.set([{ badgeText: 'Badge A' }]);
      const initialBadgesContent = getBadgesContent(emissions[emissions.length - 1]);

      state.breadcrumbsAppendExtensions.set([createExtension()]);
      const updatedBadgesContent = getBadgesContent(emissions[emissions.length - 1]);

      state.breadcrumbsAppendExtensions.set([createExtension(), createExtension()]);
      const updatedBadgesContentWithMultipleExtensions = getBadgesContent(
        emissions[emissions.length - 1]
      );

      expect(updatedBadgesContent).toBe(initialBadgesContent);
      expect(updatedBadgesContentWithMultipleExtensions).toBe(initialBadgesContent);
    } finally {
      subscription.unsubscribe();
    }
  });

  it('recreates badges content when badges change', () => {
    const state = createBreadcrumbsState();
    const emissions: ChromeBreadcrumbsAppendExtension[][] = [];
    const subscription = state.breadcrumbsAppendExtensionsWithBadges$.subscribe((extensions) => {
      emissions.push(extensions);
    });

    try {
      state.breadcrumbsAppendExtensions.set([createExtension()]);
      state.breadcrumbsBadges.set([{ badgeText: 'Badge A' }]);
      const initialBadgesContent = getBadgesContent(emissions[emissions.length - 1]);

      state.breadcrumbsBadges.set([{ badgeText: 'Badge B' }]);
      const updatedBadgesContent = getBadgesContent(emissions[emissions.length - 1]);

      expect(updatedBadgesContent).not.toBe(initialBadgesContent);
    } finally {
      subscription.unsubscribe();
    }
  });

  it('recreates badges content when isFirst changes', () => {
    const state = createBreadcrumbsState();
    const emissions: ChromeBreadcrumbsAppendExtension[][] = [];
    const subscription = state.breadcrumbsAppendExtensionsWithBadges$.subscribe((extensions) => {
      emissions.push(extensions);
    });

    try {
      state.breadcrumbsBadges.set([{ badgeText: 'Badge A' }]);
      const contentWhenFirst = getBadgesContent(emissions[emissions.length - 1]);

      state.breadcrumbsAppendExtensions.set([createExtension()]);
      const contentWhenNotFirst = getBadgesContent(emissions[emissions.length - 1]);

      expect(contentWhenNotFirst).not.toBe(contentWhenFirst);
    } finally {
      subscription.unsubscribe();
    }
  });
});
