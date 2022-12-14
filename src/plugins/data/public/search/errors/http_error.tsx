/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function getHttpError(message: string) {
  const msgFormatted = message ? (
    <>
      <EuiSpacer size="s" />
      <EuiSpacer size="s" />
      <EuiCodeBlock data-test-subj="errMessage" isCopyable={true} paddingSize="s">
        {message}
      </EuiCodeBlock>
    </>
  ) : (
    <></>
  );

  return (
    <>
      {i18n.translate('data.errors.fetchError', {
        defaultMessage: 'Please check your network connection and try again.',
      })}
      {msgFormatted}
    </>
  );
}
