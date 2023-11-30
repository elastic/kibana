/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ChromeDocTitle } from '@kbn/core-chrome-browser';
import { NotFoundPrompt } from '@kbn/shared-ux-prompt-not-found';

const defaultTitle = i18n.translate('share.urlService.redirect.components.Error.title', {
  defaultMessage: 'Unable to open URL',
  description:
    'Title displayed to user in redirect endpoint when redirection cannot be performed successfully.',
});

const defaultBody = i18n.translate('share.urlService.redirect.components.Error.body', {
  defaultMessage:
    `Sorry, the object you're looking for can't be found at this URL.` +
    ` It might have been removed or maybe it never existed.`,
});

export interface ErrorProps {
  title?: string;
  body?: string;
  docTitle: ChromeDocTitle;
  error: Error;
}

export const RedirectEmptyPrompt: React.FC<ErrorProps> = ({
  title = defaultTitle,
  body = defaultBody,
  docTitle,
  error,
}) => {
  // eslint-disable-next-line no-console
  console.error('Short URL Redirect Error', error);

  // Using the current URL containing "/app/r/", make a URL to the root basePath
  // by trimming that part to end up at the Home app or project home.
  const currentUrl = window.location.href;
  const newUrl = currentUrl.replace(/\/app\/r\/.*/, '');

  docTitle.change(
    i18n.translate('share.urlService.redirect.components.docTitle', { defaultMessage: 'Not Found' })
  );

  return (
    <NotFoundPrompt
      title={<h2>{title}</h2>}
      body={<p data-test-subj="redirectErrorEmptyPromptBody">{body}</p>}
      actions={
        <EuiButtonEmpty
          iconType="arrowLeft"
          href={newUrl}
          data-test-subj="redirectErrorEmptyPromptButton"
        >
          {i18n.translate('share.urlService.redirect.components.Error.homeButton', {
            defaultMessage: 'Back to home',
          })}
        </EuiButtonEmpty>
      }
    />
  );
};
