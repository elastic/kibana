/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { EuiSpacer } from '@elastic/eui';
import { ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { SearchRequest } from '..';
import { getNotifications } from '../../services';
import { ShardFailureOpenModalButton } from '../../shard_failure_modal';
import { SearchResponseWarning } from '../types';

/**
 * @internal
 */
export function handleWarning(
  warning: SearchResponseWarning,
  request: SearchRequest,
  response: estypes.SearchResponse,
  theme: ThemeServiceStart
) {
  const title = warning.message;

  // if warning message contains text, show in ShardFailureOpenModalButton
  if (warning.text) {
    const text = toMountPoint(
      <>
        {warning.text}
        <EuiSpacer size="s" />
        <ShardFailureOpenModalButton
          request={request.body}
          response={response}
          theme={theme}
          title={title}
        />
      </>,
      { theme$: theme.theme$ }
    );

    getNotifications().toasts.addWarning({ title, text });
    return;
  }

  // timeout warning, or shard warning with no failure reason
  getNotifications().toasts.addWarning({ title });
}
