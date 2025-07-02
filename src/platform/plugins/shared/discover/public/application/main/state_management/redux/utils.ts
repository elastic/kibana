/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuid } from 'uuid';
import { escapeRegExp } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { TabItem } from '@kbn/unified-tabs';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { DiscoverInternalState, TabState } from './types';
import type {
  InternalStateDispatch,
  InternalStateDependencies,
  TabActionPayload,
} from './internal_state';

// For some reason if this is not explicitly typed, TypeScript fails with the following error:
// TS7056: The inferred type of this node exceeds the maximum length the compiler will serialize. An explicit type annotation is needed.
type CreateInternalStateAsyncThunk = ReturnType<
  typeof createAsyncThunk.withTypes<{
    state: DiscoverInternalState;
    dispatch: InternalStateDispatch;
    extra: InternalStateDependencies;
  }>
>;

export const createInternalStateAsyncThunk: CreateInternalStateAsyncThunk =
  createAsyncThunk.withTypes();

type WithoutTabId<TPayload extends TabActionPayload> = Omit<TPayload, 'tabId'>;
type VoidIfEmpty<T> = keyof T extends never ? void : T;

export const createTabActionInjector =
  (tabId: string) =>
  <TPayload extends TabActionPayload, TReturn>(actionCreator: (params: TPayload) => TReturn) =>
  (payload: VoidIfEmpty<WithoutTabId<TPayload>>) => {
    return actionCreator({ ...(payload ?? {}), tabId } as TPayload);
  };

export type TabActionInjector = ReturnType<typeof createTabActionInjector>;

const DEFAULT_TAB_LABEL = i18n.translate('discover.defaultTabLabel', {
  defaultMessage: 'Untitled',
});
const ESCAPED_DEFAULT_TAB_LABEL = escapeRegExp(DEFAULT_TAB_LABEL);
const DEFAULT_TAB_REGEX = new RegExp(`^${ESCAPED_DEFAULT_TAB_LABEL}( \\d+)?$`); // any default tab
const DEFAULT_TAB_NUMBER_REGEX = new RegExp(`^${ESCAPED_DEFAULT_TAB_LABEL} (?<tabNumber>\\d+)$`); // tab with a number

export const createTabItem = (allTabs: TabState[]): TabItem => {
  const id = uuid();

  const existingNumbers = allTabs
    .filter((tab) => DEFAULT_TAB_REGEX.test(tab.label.trim()))
    .map((tab) => {
      const match = tab.label.trim().match(DEFAULT_TAB_NUMBER_REGEX);
      const tabNumber = match?.groups?.tabNumber;
      return tabNumber ? Number(tabNumber) : 1;
    });

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : null;
  const label = nextNumber ? `${DEFAULT_TAB_LABEL} ${nextNumber}` : DEFAULT_TAB_LABEL;

  return { id, label };
};
