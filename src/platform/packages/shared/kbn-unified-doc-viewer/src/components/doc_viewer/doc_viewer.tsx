/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { DocViewerTab } from './doc_viewer_tab';
import type { DocView, DocViewRenderProps } from '../../types';

export const INITIAL_TAB = 'unifiedDocViewer:initialTab';

export interface DocViewerApi {
  setSelectedTabId: (tabId: string) => void;
}

interface DocViewerInternalProps extends DocViewRenderProps {
  docViews: DocView[];
  initialTabId?: DocView['id'];
}

const getFullTabId = (tabId: string) => `kbn_doc_viewer_tab_${tabId}`;

/**
 * Rendering tabs with different views of 1 Elasticsearch hit in Discover.
 * The tabs are provided by the `docs_views` registry.
 * A view can contain a React `component`, or any JS framework by using
 * a `render` function.
 */
export const DocViewer = forwardRef<DocViewerApi, DocViewerInternalProps>(
  ({ docViews, initialTabId, ...renderProps }, ref) => {
    const tabs = docViews
      .filter(({ enabled }) => enabled) // Filter out disabled doc views
      .map(({ id, title, render, component }: DocView) => ({
        id: getFullTabId(id), // `id` value is used to persist the selected tab in localStorage
        name: title,
        content: (
          <DocViewerTab
            id={id}
            title={title}
            component={component}
            renderProps={renderProps}
            render={render}
          />
        ),
        ['data-test-subj']: `docViewerTab-${id}`,
      }));

    const [storedInitialTabId, setInitialTabId] = useLocalStorage<string>(INITIAL_TAB);
    const [selectedTabId, setSelectedTabId] = useState<string | undefined>(
      initialTabId ? getFullTabId(initialTabId) : storedInitialTabId
    );
    const selectedTab = selectedTabId ? tabs.find(({ id }) => id === selectedTabId) : undefined;

    useImperativeHandle(
      ref,
      () => ({
        setSelectedTabId: (tabId: string) => {
          setSelectedTabId(getFullTabId(tabId));
          setInitialTabId(getFullTabId(tabId)); // Persist the selected tab in localStorage
        },
      }),
      [setInitialTabId]
    );

    const onTabClick = useCallback(
      (tab: EuiTabbedContentTab) => {
        setSelectedTabId(tab.id);
        setInitialTabId(tab.id); // Persist the selected tab in localStorage
      },
      [setInitialTabId]
    );

    if (!tabs.length) {
      // There's a minimum of 2 tabs active in Discover.
      // This condition takes care of unit tests with 0 tabs.
      return null;
    }

    return (
      <div className="kbnDocViewer" data-test-subj="kbnDocViewer">
        <EuiTabbedContent size="s" tabs={tabs} selectedTab={selectedTab} onTabClick={onTabClick} />
      </div>
    );
  }
);

export type DocViewerProps = Parameters<typeof DocViewer>[0];
