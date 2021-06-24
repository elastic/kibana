/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const defaultTitle = i18n.translate('share.urlService.redirect.components.Error.title', {
  defaultMessage: 'Redirection error',
  description:
    'Title displayed to user in redirect endpoint when redirection cannot be performed successfully.',
});

export interface ErrorProps {
  title?: string;
  message: string;
}

export const Error: React.FC<ErrorProps> = ({ title = defaultTitle, message }) => {
  return (
    <EuiEmptyPrompt
      iconType={'alert'}
      iconColor={'danger'}
      title={<h2>{title}</h2>}
      body={<p>{message}</p>}
    />
  );
};
