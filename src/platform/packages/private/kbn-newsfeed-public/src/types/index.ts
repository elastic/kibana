/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Moment } from 'moment';

export interface NewsfeedItem {
  title: string;
  description: string;
  category?: 'observability' | 'security' | 'search';
  linkText: string | null;
  linkUrl: string;
  badge: string | null;
  publishOn: Moment;
  expireOn: Moment;
  hash: string;
  heroImageUrl?: string | null;
}

export interface FetchResult {
  kibanaVersion: string;
  hasNew: boolean;
  feedItems: NewsfeedItem[];
  error: Error | null;
}
