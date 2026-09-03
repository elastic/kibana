/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';

const LazyKeyboardShortcuts = React.lazy(async () => {
  const { KeyboardShortcuts } = await import('@kbn/esql-editor');
  return { default: KeyboardShortcuts };
});

interface Props {
  onRefresh: () => void;
}

export const DiscoverUninitialized = ({ onRefresh }: Props) => {
  const isEsqlMode = useIsEsqlMode();

  const startSearchingPrompt = (
    <EuiEmptyPrompt
      iconType="discoverApp"
      title={
        <h2>
          <FormattedMessage id="discover.uninitializedTitle" defaultMessage="Start searching" />
        </h2>
      }
      body={
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="discover.uninitializedText"
              defaultMessage="Write a query, add some filters, or simply hit Refresh to retrieve results for the current query."
            />
          </p>
        </EuiText>
      }
      actions={
        <EuiButton color="primary" fill onClick={onRefresh} data-test-subj="refreshDataButton">
          <FormattedMessage
            id="discover.uninitializedRefreshButtonText"
            defaultMessage="Refresh data"
          />
        </EuiButton>
      }
    />
  );

  if (!isEsqlMode) {
    return startSearchingPrompt;
  }

  return (
    <Suspense fallback={null}>
      <LazyKeyboardShortcuts display="inline" />
    </Suspense>
  );
};
