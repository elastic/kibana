/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps, ComponentRef, RefAttributes } from 'react';
import React, { forwardRef, useCallback, useImperativeHandle, useState, useEffect } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { EuiTabbedContent } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import { DocViewerTab } from './doc_viewer_tab';
import type { DocView, DocViewRenderProps } from '../../types';
import { useDocViewerTabViewedEvent } from '../../analytics';
import { useRestorableState, withRestorableState } from './restorable_state';

export const INITIAL_TAB = 'unifiedDocViewer:initialTab';

export interface InternalDocViewerApi {
  setSelectedTabId: (tabId: string) => void;
}

export interface InternalDocViewerProps
  extends DocViewRenderProps,
    RefAttributes<InternalDocViewerApi>,
    Pick<AnalyticsServiceStart, 'reportEvent'> {
  docViews: DocView[];
  initialTabId?: DocView['id'];
  onUpdateSelectedTabId?: (tabId: string | undefined) => void;
}

const getFullTabId = (tabId: string) => `kbn_doc_viewer_tab_${tabId}`;
const getOriginalTabId = (fullTabId: string) => fullTabId.replace('kbn_doc_viewer_tab_', '');

const InternalDocViewer = forwardRef<InternalDocViewerApi, InternalDocViewerProps>(
  ({ docViews, initialTabId, onUpdateSelectedTabId, reportEvent, ...renderProps }, ref) => {
    const tabs = docViews
      .filter(({ enabled }) => enabled) // Filter out disabled doc views
      .map((docView: DocView) => ({
        id: getFullTabId(docView.id), // `id` value is used to persist the selected tab in localStorage
        name: docView.title,
        content: (
          <DocViewerTab
            key={`${renderProps.hit.id}_${docView.id}`}
            docView={docView}
            renderProps={renderProps}
          />
        ),
        ['data-test-subj']: `docViewerTab-${docView.id}`,
      }));

    const [storedInitialTabId, setInitialTabId] = useLocalStorage<string>(INITIAL_TAB);
    const [selectedTabId, setSelectedTabId] = useState<string | undefined>(
      initialTabId ? getFullTabId(initialTabId) : storedInitialTabId
    );
    const selectedTab =
      (selectedTabId ? tabs.find(({ id }) => id === selectedTabId) : undefined) ?? tabs.at(0);

    useEffect(() => {
      onUpdateSelectedTabId?.(selectedTabId ? getOriginalTabId(selectedTabId) : undefined);
    }, [onUpdateSelectedTabId, selectedTabId]);

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

    const [initialDocViewerViewedEventKey, setInitialDocViewerViewedEventKey] = useRestorableState(
      'initialDocViewerViewedEventKey',
      undefined
    );

    useDocViewerTabViewedEvent({
      reportEvent,
      tabId: selectedTab ? getOriginalTabId(selectedTab.id) : undefined,
      hit: renderProps.hit,
      initialEventKey: initialDocViewerViewedEventKey,
      onEventKeyChange: setInitialDocViewerViewedEventKey,
    });

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

export const DocViewer = withRestorableState(InternalDocViewer);

export type DocViewerProps = ComponentProps<typeof DocViewer>;
export type DocViewerApi = ComponentRef<typeof DocViewer>;
