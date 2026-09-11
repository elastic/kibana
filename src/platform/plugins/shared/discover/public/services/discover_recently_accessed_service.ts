/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { RecentlyAccessed } from '@kbn/recently-accessed';
import { RecentlyAccessedService } from '@kbn/recently-accessed';
import { getSavedSearchFullPathUrl } from '@kbn/saved-search-plugin/public';

let discoverRecentlyAccessed: RecentlyAccessed;

export const getDiscoverRecentlyAccessedService = (http: Pick<HttpStart, 'basePath'>) => {
  if (!discoverRecentlyAccessed) {
    discoverRecentlyAccessed = new RecentlyAccessedService().start({
      http,
      key: 'discoverRecentlyAccessed',
    });
  }
  return discoverRecentlyAccessed;
};

const untitledDiscoverSessionTitle = () =>
  i18n.translate('discover.defaultDiscoverSessionTitle', {
    defaultMessage: 'Untitled Discover session',
  });

export const rememberDiscoverSession = (
  http: Pick<HttpStart, 'basePath'>,
  chrome: { recentlyAccessed: Pick<RecentlyAccessed, 'add'> },
  session: { id: string; title?: string }
) => {
  const link = getSavedSearchFullPathUrl(session.id);
  const label = session.title || untitledDiscoverSessionTitle();
  chrome.recentlyAccessed.add(link, label, session.id);
  getDiscoverRecentlyAccessedService(http).add(link, label, session.id);
};

export const forgetDiscoverSession = (
  http: Pick<HttpStart, 'basePath'>,
  chrome: { recentlyAccessed: Pick<RecentlyAccessed, 'remove'> },
  id: string
) => {
  getDiscoverRecentlyAccessedService(http).remove(id);
  chrome.recentlyAccessed.remove(id);
};
