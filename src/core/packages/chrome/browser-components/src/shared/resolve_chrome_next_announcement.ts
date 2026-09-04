/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppHeaderTitle, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import type { InlineAppHeaderState } from '@kbn/core-chrome-browser-internal-types';

export const normalizeAppHeaderTitle = (title?: AppHeaderTitle): string | undefined => {
  if (title == null) {
    return undefined;
  }

  if (typeof title === 'string') {
    return title.trim() || undefined;
  }

  return title.text.trim() || title.placeholder?.trim() || undefined;
};

export const getDeepestActiveNavigationTitle = (
  activeNodes?: ChromeProjectNavigationNode[][]
): string | undefined => {
  const path = activeNodes?.[0];
  if (!path?.length) {
    return undefined;
  }

  for (let i = path.length - 1; i >= 0; i--) {
    const title = path[i].title?.trim();
    if (title) {
      return title;
    }
  }

  return undefined;
};

export interface ChromeNextAnnouncementSources {
  inline?: InlineAppHeaderState;
  registeredTitle?: AppHeaderTitle;
  docTitleParts?: readonly string[];
  activeNodes?: ChromeProjectNavigationNode[][];
}

export const resolveChromeNextAnnouncement = ({
  inline,
  registeredTitle,
  docTitleParts,
  activeNodes,
}: ChromeNextAnnouncementSources): string => {
  if (inline !== undefined) {
    const inlineTitle = normalizeAppHeaderTitle(inline.title);
    if (inlineTitle) {
      return inlineTitle;
    }
  } else {
    const chromeOwnedTitle = normalizeAppHeaderTitle(registeredTitle);
    if (chromeOwnedTitle) {
      return chromeOwnedTitle;
    }
  }

  if (docTitleParts && docTitleParts.length >= 2) {
    const pageTitle = docTitleParts[0]?.trim();
    if (pageTitle) {
      return pageTitle;
    }
  }

  return getDeepestActiveNavigationTitle(activeNodes) ?? '';
};
