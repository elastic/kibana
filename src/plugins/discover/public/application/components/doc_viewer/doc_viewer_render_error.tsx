/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiCallOut, EuiCodeBlock } from '@elastic/eui';
import { formatMsg, formatStack } from '../../../../../kibana_legacy/public';

interface Props {
  error: Error | string;
}

export function DocViewerError({ error }: Props) {
  const errMsg = formatMsg(error);
  const errStack = typeof error === 'object' ? formatStack(error) : '';

  return (
    <EuiCallOut title={errMsg} color="danger" iconType="cross" data-test-subj="docViewerError">
      {errStack && <EuiCodeBlock>{errStack}</EuiCodeBlock>}
    </EuiCallOut>
  );
}
