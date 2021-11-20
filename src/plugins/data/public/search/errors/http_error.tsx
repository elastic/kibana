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
  return (
    <>
      {i18n.translate('data.errors.fetchError', {
        defaultMessage:
          'Check your network and proxy configuration. If the problem persists, contact your network administrator.',
      })}
      <EuiSpacer size="s" />
      <EuiSpacer size="s" />
      <EuiCodeBlock data-test-subj="errMessage" isCopyable={true} paddingSize="s">
        {message}
      </EuiCodeBlock>
    </>
  );
}
