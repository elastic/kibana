/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import { createContext, useContext } from 'react';

export interface HistoryItem {
  title: string;
  iconType?: IconType;
  onClick: () => void;
}

export interface FlyoutHistoryContextValue {
  historyKey: symbol;
  historyItems: HistoryItem[];
}

export const FlyoutHistoryContext = createContext<FlyoutHistoryContextValue | null>(null);

/**
 * @deprecated Remove `historyKey` prop from `EuiFlyout` once EUI reads it from
 * `EuiFlyoutHistoryKeyContext` (Step 4 / PR-7). Until then, pass the value from
 * this hook as the prop so EUI registers the flyout under the correct history group.
 */
export const useFlyoutHistoryKey = (): symbol | undefined =>
  useContext(FlyoutHistoryContext)?.historyKey;

export const useHistoryItems = (): HistoryItem[] =>
  useContext(FlyoutHistoryContext)?.historyItems ?? [];
