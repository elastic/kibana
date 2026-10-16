/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, type ReactNode } from 'react';
import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';

const DEFAULT_LOADING_FALLBACK = (
  <EuiFlexGroup justifyContent="center">
    <EuiLoadingSpinner />
  </EuiFlexGroup>
);

export type KibanaContentListPageTab =
  | {
      /** Stable identifier shared with the corresponding application tab. */
      readonly id: string;
      /**
       * Returns the tab content immediately. Use it when everything the content needs is
       * already available; components it renders may still fetch their own data.
       */
      readonly render: () => ReactNode;
      readonly load?: never;
    }
  | {
      /** Stable identifier shared with the corresponding application tab. */
      readonly id: string;
      /**
       * Resolves the tab content asynchronously. Use it when the content can only be
       * built after async work, such as lazy-importing a module or fetching services.
       * Called after mount each time the tab becomes active; the loading fallback shows
       * until it settles, and a rejection is rethrown to the nearest error boundary.
       */
      readonly load: () => Promise<ReactNode>;
      readonly render?: never;
    };

type LoadState =
  | {
      readonly status: 'resolved';
      readonly source: () => Promise<ReactNode>;
      readonly content: ReactNode;
    }
  | {
      readonly status: 'rejected';
      readonly source: () => Promise<ReactNode>;
      readonly error: Error;
    };

export interface KibanaContentListPageActiveTabProps {
  /** Available tab-content definitions. Memoize them; a new `load` function reloads the active tab. */
  readonly tabs: readonly KibanaContentListPageTab[];
  /** Identifier of the tab selected by the consuming application. */
  readonly activeTabId: string;
  /** Content displayed while asynchronous tab content is resolving. */
  readonly loadingFallback?: ReactNode;
}

const normalizeError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const ActiveTab = ({
  tabs,
  activeTabId,
  loadingFallback = DEFAULT_LOADING_FALLBACK,
}: KibanaContentListPageActiveTabProps) => {
  const activeTab = tabs.find(({ id }) => id === activeTabId);

  if (!activeTab) {
    throw new Error(`No content-list page tab matches the active tab identifier "${activeTabId}".`);
  }

  const { load } = activeTab;
  const [loadState, setLoadState] = useState<LoadState>();

  useEffect(() => {
    if (!load) {
      return;
    }

    let cancelled = false;

    load().then(
      (content) => {
        if (!cancelled) {
          setLoadState({
            status: 'resolved',
            source: load,
            content,
          });
        }
      },
      (error) => {
        if (!cancelled) {
          setLoadState({
            status: 'rejected',
            source: load,
            error: normalizeError(error),
          });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [load]);

  if (activeTab.render) {
    return activeTab.render();
  }

  if (loadState?.source !== activeTab.load) {
    return loadingFallback;
  }

  if (loadState.status === 'rejected') {
    throw loadState.error;
  }

  return loadState.content;
};

/** Resolves and renders the content associated with the active application tab. */
export const KibanaContentListPageActiveTab = (props: KibanaContentListPageActiveTabProps) => (
  // Remount when tabs change so their component state is not shared.
  <ActiveTab key={props.activeTabId} {...props} />
);
