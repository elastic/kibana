/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';

const DEFAULT_LOADING_FALLBACK = (
  <EuiFlexGroup justifyContent="center">
    <EuiLoadingSpinner />
  </EuiFlexGroup>
);

type TabLoad = () => Promise<ReactNode>;

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
      readonly load: TabLoad;
      readonly render?: never;
    };

export interface KibanaContentListPageActiveTabProps {
  /** Available tab-content definitions. Memoize them; a new `load` function reloads the active tab. */
  readonly tabs: readonly KibanaContentListPageTab[];
  /** Identifier of the tab selected by the consuming application. */
  readonly activeTabId: string;
  /** Content displayed while asynchronous tab content is resolving. */
  readonly loadingFallback?: ReactNode;
}

type LoadResult =
  | {
      readonly status: 'resolved';
      readonly source: TabLoad;
      readonly content: ReactNode;
    }
  | {
      readonly status: 'rejected';
      readonly source: TabLoad;
      readonly error: Error;
    };

const normalizeError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

interface AsyncTabProps {
  load: TabLoad;
  loadingFallback: ReactNode;
}

const AsyncTab = ({ load, loadingFallback }: AsyncTabProps) => {
  const { loading, value: result } = useAsync(async (): Promise<LoadResult> => {
    try {
      return {
        status: 'resolved',
        source: load,
        content: await load(),
      };
    } catch (error) {
      return {
        status: 'rejected',
        source: load,
        error: normalizeError(error),
      };
    }
  }, [load]);

  if (loading || !result || result.source !== load) {
    return loadingFallback;
  }

  if (result.status === 'rejected') {
    throw result.error;
  }

  return result.content;
};

const ActiveTab = ({
  tabs,
  activeTabId,
  loadingFallback = DEFAULT_LOADING_FALLBACK,
}: KibanaContentListPageActiveTabProps) => {
  const activeTab = tabs.find(({ id }) => id === activeTabId);

  if (!activeTab) {
    throw new Error(`No content-list page tab matches the active tab identifier "${activeTabId}".`);
  }

  if (activeTab.render) {
    return activeTab.render();
  }

  return <AsyncTab load={activeTab.load} loadingFallback={loadingFallback} />;
};

/** Resolves and renders the content associated with the active application tab. */
export const KibanaContentListPageActiveTab = (props: KibanaContentListPageActiveTabProps) => (
  // Remount when tabs change so their component state is not shared.
  <ActiveTab key={props.activeTabId} {...props} />
);
