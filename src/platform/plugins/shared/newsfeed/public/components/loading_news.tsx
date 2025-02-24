/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { EuiLoadingElastic } from '@elastic/eui';

export const NewsLoadingPrompt = ({ showPlainSpinner }: { showPlainSpinner: boolean }) => {
  return (
    <EuiEmptyPrompt
      title={showPlainSpinner ? <EuiLoadingSpinner size="xl" /> : <EuiLoadingElastic size="xl" />}
      body={
        <p>
          <FormattedMessage
            id="newsfeed.loadingPrompt.gettingNewsText"
            defaultMessage="Getting the latest news..."
          />
        </p>
      }
    />
  );
};
