/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

interface Props {
  onRefresh: () => void;
}

export const DiscoverUninitialized = ({ onRefresh }: Props) => {
  return (
    <I18nProvider>
      <EuiEmptyPrompt
        iconType="discoverApp"
        title={
          <h2>
            <FormattedMessage id="discover.uninitializedTitle" defaultMessage="Start searching" />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="discover.uninitializedText"
              defaultMessage="Write a query, add some filters, or simply hit Refresh to retrieve results for the current query."
            />
          </p>
        }
        actions={
          <EuiButton color="primary" fill onClick={onRefresh}>
            <FormattedMessage
              id="discover.uninitializedRefreshButtonText"
              defaultMessage="Refresh data"
            />
          </EuiButton>
        }
      />
    </I18nProvider>
  );
};
