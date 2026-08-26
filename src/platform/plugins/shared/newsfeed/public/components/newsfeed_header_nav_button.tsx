/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { EuiHeaderSectionItemButton, EuiIcon, EuiToolTip, type EuiToolTipRef } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SidebarStart } from '@kbn/core-chrome-sidebar';
import type { NewsfeedApi } from '../lib/api';
import type { FetchResult } from '../types';
import { toggleNewsfeedSidebar } from '../sidebar/open';

const whatsNewLabel = i18n.translate('newsfeed.headerButton.whatsNewLabel', {
  defaultMessage: "What's new",
});

export interface Props {
  newsfeedApi: NewsfeedApi;
  sidebar: SidebarStart;
}

export const NewsfeedNavButton = ({ newsfeedApi, sidebar }: Props) => {
  const [newsFetchResult, setNewsFetchResult] = useState<FetchResult | null | void>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<EuiToolTipRef>(null);

  const hasNew = useMemo(() => {
    return newsFetchResult ? newsFetchResult.hasNew : false;
  }, [newsFetchResult]);

  useEffect(() => {
    const sub = sidebar.getCurrentAppId$().subscribe((appId) => {
      const open = appId === 'newsfeed';
      setSidebarOpen((prev) => {
        // Restore focus to this button when the sidebar closes while focus was inside
        if (prev && !open) {
          if (document.activeElement?.matches(':focus-visible')) {
            buttonRef.current?.focus();
          }
        }
        return open;
      });
    });
    return () => sub.unsubscribe();
  }, [sidebar]);

  useEffect(() => {
    const subscription = newsfeedApi.fetchResults$.subscribe((results) => {
      setNewsFetchResult(results);
    });
    return () => subscription.unsubscribe();
  }, [newsfeedApi]);

  const handleClick = useCallback(() => {
    tooltipRef.current?.hideToolTip();
    toggleNewsfeedSidebar(sidebar, newsfeedApi, newsFetchResult);
  }, [sidebar, newsfeedApi, newsFetchResult]);

  // The tooltip stays mounted unconditionally: swapping it in and out would change the element
  // type at this position, remounting the button and dropping focus when the sidebar closes.
  return (
    <EuiToolTip ref={tooltipRef} content={whatsNewLabel} disableScreenReaderOutput>
      <EuiHeaderSectionItemButton
        ref={(node: HTMLButtonElement | null) => {
          buttonRef.current = node;
        }}
        data-test-subj={hasNew ? 'newsfeedHasUnread' : 'newsfeedAllRead'}
        aria-expanded={sidebarOpen}
        aria-haspopup="true"
        aria-label={
          hasNew
            ? i18n.translate('newsfeed.headerButton.unreadAriaLabel', {
                defaultMessage: 'Newsfeed menu - unread items available',
              })
            : i18n.translate('newsfeed.headerButton.readAriaLabel', {
                defaultMessage: 'Newsfeed menu - all items read',
              })
        }
        notification={hasNew ? true : null}
        onClick={handleClick}
      >
        <EuiIcon type="popper" size="m" aria-hidden={true} />
      </EuiHeaderSectionItemButton>
    </EuiToolTip>
  );
};
