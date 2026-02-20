/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { Suspense } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { helpLabel } from '@kbn/esql-editor';

const LazyESQLMenu = React.lazy(async () => {
  const module = await import('@kbn/esql-editor');
  return { default: module.ESQLMenu };
});

const LazyEsqlEditorActionsProvider = React.lazy(async () => {
  const module = await import('@kbn/esql-editor');
  return { default: module.EsqlEditorActionsProvider };
});

export const ESQLMenu: React.FC<{
  hideHistory?: boolean;
  onESQLDocsFlyoutVisibilityChanged?: (isOpen: boolean) => void;
}> = (props) => (
  <Suspense
    fallback={
      <EuiToolTip position="top" content={helpLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="question"
          size="xs"
          aria-label={helpLabel}
          data-test-subj="esql-help-popover-button"
          color="text"
          isDisabled
        />
      </EuiToolTip>
    }
  >
    <LazyESQLMenu {...props} />
  </Suspense>
);

export const EsqlEditorActionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Suspense fallback={<>{children}</>}>
    <LazyEsqlEditorActionsProvider>{children}</LazyEsqlEditorActionsProvider>
  </Suspense>
);
