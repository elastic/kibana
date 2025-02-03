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
import type { Props } from './editor_flyout_content_container';

const ContentEditorFlyoutContentContainer = React.lazy(() =>
  import('./editor_flyout_content_container').then(
    ({ ContentEditorFlyoutContentContainer: _ContentEditorFlyoutContentContainer }) => ({
      default: _ContentEditorFlyoutContentContainer,
    })
  )
);

export const ContentEditorLoader: React.FC<Props> = (props) => {
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
      <ContentEditorFlyoutContentContainer {...props} />
    </React.Suspense>
  );
};
