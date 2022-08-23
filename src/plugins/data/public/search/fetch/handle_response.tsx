/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { ResponseWarning } from '@kbn/inspector-plugin/common/adapters/request/types';
import { estypes } from '@elastic/elasticsearch';
import { SearchRequest } from '../../../common';
import { ShardFailureOpenModalButton } from '../../shard_failure_modal';
import { getNotifications } from '../../services';

export function handleWarnings(
  warning: ResponseWarning,
  request: SearchRequest,
  response: estypes.SearchResponse,
  theme: ThemeServiceStart
) {
  if (warning.type === 'timed_out') {
    getNotifications().toasts.addWarning({
      title: warning.message,
    });
  }

  if (warning.type === 'generic_shard_warning') {
    const text = toMountPoint(
      <>
        {warning.text}
        <EuiSpacer size="s" />
        <ShardFailureOpenModalButton
          request={request.body}
          response={response}
          theme={theme}
          title={warning.message}
        />
      </>,
      { theme$: theme.theme$ }
    );

    getNotifications().toasts.addWarning({ title: warning.message, text });
  }
}
