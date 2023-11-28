/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { HttpStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

const defaultTitle = i18n.translate('share.urlService.redirect.components.Error.title', {
  defaultMessage: 'Unable to open URL',
  description:
    'Title displayed to user in redirect endpoint when redirection cannot be performed successfully.',
});

const defaultBody = i18n.translate('share.urlService.redirect.components.Error.body', {
  defaultMessage:
    'The stored URL for this link could not be opened. This could be due to lost Kibana Saved Object data.',
});

export interface ErrorProps {
  title?: string;
  body?: string;
  error: Error;
  http: HttpStart;
}

export const RedirectEmptyPrompt: React.FC<ErrorProps> = ({
  title = defaultTitle,
  body = defaultBody,
  ...props
}) => {
  // eslint-disable-next-line no-console
  console.error('Short URL Redirect Error', props.error);

  return (
    <EuiEmptyPrompt
      title={<h2>{title}</h2>}
      body={
        <>
          <p data-test-subj="redirectErrorEmptyPromptBody">{body}</p>
          <p>
            <EuiButton
              iconType="refresh"
              fill={true}
              href={props.http.basePath.get()}
              data-test-subj="redirectErrorEmptyPromptButton"
            >
              {i18n.translate('share.urlService.redirect.components.Error.homeButton', {
                defaultMessage: 'Back to home',
              })}
            </EuiButton>
          </p>
        </>
      }
    />
  );
};
