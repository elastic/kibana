/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import type { NewsfeedFlyoutProps } from '@kbn/newsfeed-public';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useNewsfeedContext } from '../context';

// Lazy load the NewsfeedFlyout from the package
const LazyNewsfeedFlyout = lazy<React.ComponentType<NewsfeedFlyoutProps>>(() =>
  import('@kbn/newsfeed-public').then((module) => ({
    default: module.NewsfeedFlyout,
  }))
);

// Omit context values since we'll inject them from the plugin's context
export type NewsfeedFlyoutLazyProps = Omit<
  NewsfeedFlyoutProps,
  'newsFetchResult' | 'setFlyoutVisible' | 'ref'
>;

export const NewsfeedFlyoutLazy: React.FC<NewsfeedFlyoutLazyProps> = ({
  showPlainSpinner,
  isServerless,
  ...flyoutProps
}) => {
  // Get context values from the plugin's context (not bundled with lazy component)
  const { newsFetchResult, setFlyoutVisible } = useNewsfeedContext();

  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}
        >
          <EuiLoadingSpinner size="xl" />
        </div>
      }
    >
      <LazyNewsfeedFlyout
        showPlainSpinner={showPlainSpinner}
        isServerless={isServerless}
        newsFetchResult={newsFetchResult}
        setFlyoutVisible={setFlyoutVisible}
        {...flyoutProps}
      />
    </Suspense>
  );
};
