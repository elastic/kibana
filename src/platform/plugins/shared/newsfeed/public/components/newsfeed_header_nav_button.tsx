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
import type { Observable } from 'rxjs';
import type { NewsfeedApi } from '../lib/api';
import type { FetchResult } from '../types';

const whatsNewLabel = i18n.translate('newsfeed.headerButton.whatsNewLabel', {
  defaultMessage: "What's new",
});

export interface Props {
  newsfeedApi: NewsfeedApi;
  /** Emits true while the newsfeed panel is showing. */
  isOpen$: Observable<boolean>;
  /** Show the newsfeed panel, or hide it if it is already showing. */
  onToggle: () => void;
}

export const NewsfeedNavButton = ({ newsfeedApi, isOpen$, onToggle }: Props) => {
  const [newsFetchResult, setNewsFetchResult] = useState<FetchResult | null | void>(null);
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<EuiToolTipRef>(null);

  const hasNew = useMemo(() => {
    return newsFetchResult ? newsFetchResult.hasNew : false;
  }, [newsFetchResult]);

  useEffect(() => {
    const subscription = isOpen$.subscribe(setIsOpen);
    return () => subscription.unsubscribe();
  }, [isOpen$]);

  useEffect(() => {
    const subscription = newsfeedApi.fetchResults$.subscribe((results) => {
      setNewsFetchResult(results);
    });
    return () => subscription.unsubscribe();
  }, [newsfeedApi]);

  const handleClick = useCallback(() => {
    tooltipRef.current?.hideToolTip();
    onToggle();
  }, [onToggle]);

  return (
    <EuiToolTip ref={tooltipRef} content={whatsNewLabel} disableScreenReaderOutput>
      <EuiHeaderSectionItemButton
        data-test-subj={hasNew ? 'newsfeedHasUnread' : 'newsfeedAllRead'}
        aria-expanded={isOpen}
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
