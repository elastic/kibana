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
import { SearchResponseWarning } from '@kbn/inspector-plugin/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { getNotifications } from '../../services';
import { ShardFailureOpenModalButton } from '../../shard_failure_modal';

/**
 * @internal
 */
export function handleWarning(
  warning: SearchResponseWarning,
  request: estypes.SearchRequest,
  response: estypes.SearchResponse,
  theme: ThemeServiceStart
) {
  if (warning.isTimeout) {
    getNotifications().toasts.addWarning({ title: warning.message });
  }

  if (warning.isShardFailure) {
    const title = warning.message;
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
  }
}
