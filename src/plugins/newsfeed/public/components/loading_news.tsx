/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { EuiLoadingElastic } from '@elastic/eui';

export const NewsLoadingPrompt = () => {
  return (
    <EuiEmptyPrompt
      title={<EuiLoadingElastic size="xl" />}
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
