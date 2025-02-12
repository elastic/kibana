/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useContext } from 'react';
import { EuiBadge, EuiHeaderAlert, EuiLink } from '@elastic/eui';
import { NewsfeedItem } from '../types';
import { NewsEmptyPrompt } from './empty_news';
import { NewsLoadingPrompt } from './loading_news';
import { NewsfeedContext } from './newsfeed_header_nav_button';

export const NewsfeedContent = ({ showPlainSpinner }: { showPlainSpinner: boolean }) => {
  const { newsFetchResult } = useContext(NewsfeedContext);
  return (
    <>
      {!newsFetchResult ? (
        <NewsLoadingPrompt showPlainSpinner={showPlainSpinner} />
      ) : newsFetchResult.feedItems.length > 0 ? (
        newsFetchResult.feedItems.map((item: NewsfeedItem) => {
          return (
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
          );
        })
      ) : (
        <NewsEmptyPrompt />
      )}
    </>
  );
};
