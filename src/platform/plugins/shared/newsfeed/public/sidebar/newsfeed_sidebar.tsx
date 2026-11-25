/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderAlert,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SidebarHeader, SidebarBody } from '@kbn/core-chrome-sidebar-components';
import type { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { useIsServerless } from '@kbn/react-env';
import type { NewsfeedApi } from '../lib/api';
import type { FetchResult, NewsfeedItem } from '../types';
import { NewsEmptyPrompt } from '../components/empty_news';
import { NewsLoadingPrompt } from '../components/loading_news';

export interface NewsfeedSidebarServices {
  newsfeedApi: NewsfeedApi;
  hasCustomBranding$: Observable<boolean>;
}

export interface NewsfeedSidebarProps extends NewsfeedSidebarServices {
  onClose: () => void;
}

export const NewsfeedSidebar = ({
  newsfeedApi,
  hasCustomBranding$,
  onClose,
}: NewsfeedSidebarProps) => {
  const isServerless = useIsServerless();
  const [newsFetchResult, setNewsFetchResult] = useState<FetchResult | null | void>(null);
  const hasCustomBranding = useObservable(hasCustomBranding$, false);

  useEffect(() => {
    const subscription = newsfeedApi.fetchResults$.subscribe((results) => {
      setNewsFetchResult(results);
    });
    return () => subscription.unsubscribe();
  }, [newsfeedApi]);

  return (
    <>
      <SidebarHeader title={whatsNewTitle} onClose={onClose} />
      <SidebarBody scrollable>
        <div data-test-subj="newsfeedSidebar">
          {!newsFetchResult ? (
            <NewsLoadingPrompt showPlainSpinner={hasCustomBranding} />
          ) : newsFetchResult.feedItems.length > 0 ? (
            <>
              {newsFetchResult.feedItems.map((item: NewsfeedItem) => (
                <EuiHeaderAlert
                  key={item.hash}
                  title={item.title}
                  text={item.description}
                  data-test-subj="newsHeadAlert"
                  action={
                    <EuiLink target="_blank" href={item.linkUrl} external>
                      {item.linkText}
                    </EuiLink>
                  }
                  date={item.publishOn.format('DD MMMM YYYY')}
                  badge={item.badge ? <EuiBadge color="hollow">{item.badge}</EuiBadge> : undefined}
                />
              ))}
              {!isServerless && (
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiText color="subdued" size="s">
                      <p>
                        <FormattedMessage
                          id="newsfeed.sidebar.versionTextLabel"
                          defaultMessage="{version}"
                          values={{ version: `Version ${newsFetchResult.kibanaVersion}` }}
                        />
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </>
          ) : (
            <NewsEmptyPrompt />
          )}
        </div>
      </SidebarBody>
    </>
  );
};

const whatsNewTitle = i18n.translate('newsfeed.sidebar.whatsNewTitle', {
  defaultMessage: "What's new at Elastic",
});
