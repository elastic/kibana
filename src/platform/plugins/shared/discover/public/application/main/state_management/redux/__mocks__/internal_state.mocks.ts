/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_TAB_STATE } from '../constants';
import type { RecentlyClosedTabState, TabState } from '../types';

export const getTabStateMock = (partial: Partial<TabState> & Pick<TabState, 'id'>): TabState => ({
  ...DEFAULT_TAB_STATE,
  label: 'Untitled',
  ...partial,
});

export const getRecentlyClosedTabStateMock = (
  partial: Partial<RecentlyClosedTabState> & Pick<RecentlyClosedTabState, 'id' | 'closedAt'>
): RecentlyClosedTabState => ({ ...getTabStateMock(partial), closedAt: partial.closedAt });
