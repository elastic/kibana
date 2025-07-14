/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutSessionOpenSystemOptions,
  EuiFlyoutSessionProvider,
  EuiFlyoutSessionRenderContext,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiFlyoutSession,
} from '@elastic/eui';
interface DeepHistoryAppMeta {
  page: 'page01' | 'page02' | 'page03' | 'page04' | 'page05' | '';
}

const getHistorySystemFlyoutOptions = (
  page: DeepHistoryAppMeta['page']
): EuiFlyoutSessionOpenSystemOptions<DeepHistoryAppMeta> => {
  return {
    title: page,
    size: 'm',
    meta: { page },
    flyoutProps: {
      type: 'push',
      pushMinBreakpoint: 'xs',
      'aria-label': page,
    },
  };
};

const DeepHistoryPage: React.FC<DeepHistoryAppMeta> = ({ page }) => {
  const { openSystemFlyout, closeSession } = useEuiFlyoutSession();
  const [nextPage, setNextPage] = useState<DeepHistoryAppMeta['page']>('');

  useEffect(() => {
    switch (page) {
      case 'page01':
        setNextPage('page02');
        break;
      case 'page02':
        setNextPage('page03');
        break;
      case 'page03':
        setNextPage('page04');
        break;
      case 'page04':
        setNextPage('page05');
        break;
      case 'page05':
        setNextPage('');
        break;
    }
  }, [page]);

  const handleOpenNextFlyout = () => {
    const options = getHistorySystemFlyoutOptions(nextPage);
    openSystemFlyout(options);
  };

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="flyout-review-order-title">Page {page}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {nextPage === '' ? (
          <>
            <EuiText>
              <p>
                This is the content for {page}.<br />
                You have reached the end of the history.
              </p>
            </EuiText>
          </>
        ) : (
          <>
            <EuiText>
              <p>This is the content for {page}.</p>
            </EuiText>
            <EuiSpacer />
            <EuiButton onClick={handleOpenNextFlyout}>Navigate to {nextPage}</EuiButton>
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton onClick={closeSession} color="danger">
          Close
        </EuiButton>
      </EuiFlyoutFooter>
    </>
  );
};

// Component for the main control buttons and state display
const DeepHistoryAppControls: React.FC = () => {
  const { openSystemFlyout, isFlyoutOpen } = useEuiFlyoutSession();

  const handleOpenSystemFlyout = () => {
    const options = getHistorySystemFlyoutOptions('page01');
    openSystemFlyout(options);
  };

  return (
    <>
      <EuiButton onClick={handleOpenSystemFlyout} isDisabled={isFlyoutOpen} fill>
        Begin flyout navigation
      </EuiButton>
    </>
  );
};

export const DeepHistoryApp: React.FC = () => {
  // Render function for MAIN flyout content
  const renderMainFlyoutContent = (context: EuiFlyoutSessionRenderContext<DeepHistoryAppMeta>) => {
    const { meta } = context;
    const { page } = meta || { page: 'page01' };
    return <DeepHistoryPage page={page} />;
  };

  return (
    <>
      <EuiText>
        <p>
          This demo shows how to use the <code>openSystemFlyout</code> function to systematically
          navigate from one flyout to the next in a long chain of history. Note the back button and
          history popover control shown in the main flyout top menu bar.
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiFlyoutSessionProvider
        renderMainFlyoutContent={renderMainFlyoutContent}
        onUnmount={() => console.log('System flyouts have been unmounted')}
      >
        <DeepHistoryAppControls />
      </EuiFlyoutSessionProvider>
    </>
  );
};
