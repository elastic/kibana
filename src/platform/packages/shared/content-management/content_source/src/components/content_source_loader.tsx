/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader } from '@elastic/eui';
import type { ContentSourceFlyoutContainerProps } from './content_flyout_container';

const ContentSourceFlyoutContentContainer = React.lazy(() =>
  import('./content_flyout_container').then(
    ({ ContentSourceFlyoutContainer: _ContentSourceFlyoutContentContainer }) => ({
      default: _ContentSourceFlyoutContentContainer,
    })
  )
);

export const ContentSourceLoader: React.FC<ContentSourceFlyoutContainerProps> = (props) => {
  return (
    <React.Suspense
      fallback={
        <>
          <EuiFlyoutHeader />
          <EuiFlyoutBody />
          <EuiFlyoutFooter />
        </>
      }
    >
      <ContentSourceFlyoutContentContainer {...props} />
    </React.Suspense>
  );
};
