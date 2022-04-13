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

export const NewsEmptyPrompt = () => {
  return (
    <EuiEmptyPrompt
      iconType="documents"
      titleSize="s"
      data-test-subj="emptyNewsfeed"
      title={
        <h2>
          <FormattedMessage id="newsfeed.emptyPrompt.noNewsTitle" defaultMessage="No news?" />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="newsfeed.emptyPrompt.noNewsText"
            defaultMessage="If your Kibana instance doesn’t have internet access, ask your administrator to disable this feature. Otherwise, we’ll keep trying to fetch the news."
          />
        </p>
      }
    />
  );
};
