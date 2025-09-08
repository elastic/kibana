/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuid } from 'uuid';
import { i18n } from '@kbn/i18n';
import { getNextTabNumber, type TabItem } from '@kbn/unified-tabs';
import { createAsyncThunk, miniSerializeError } from '@reduxjs/toolkit';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
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

export const createInternalStateAsyncThunk: CreateInternalStateAsyncThunk = ((
  ...[typePrefix, payloadCreator, options]: Parameters<CreateInternalStateAsyncThunk>
) => {
  return createAsyncThunk(typePrefix, payloadCreator, {
    ...options,
    serializeError: (error) => {
      return error instanceof SavedObjectNotFound
        ? error
        : options?.serializeError?.(error) ?? miniSerializeError(error);
    },
  });
}) as CreateInternalStateAsyncThunk;

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

export const createTabItem = (allTabs: TabState[]): TabItem => {
  const id = uuid();
  const baseLabel = DEFAULT_TAB_LABEL;

  const nextNumber = getNextTabNumber(allTabs, baseLabel);
  const label = nextNumber ? `${baseLabel} ${nextNumber}` : baseLabel;

  return { id, label };
};
