/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiSpacer } from '@elastic/eui';
import { ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import type { SearchRequest } from '..';
import { IKibanaSearchResponse, SearchSourceSearchOptions } from '../../../common';
import { getNotifications } from '../../services';
import { ShardFailureOpenModalButton } from '../../shard_failure_modal';
import { extractWarnings } from './extract_warnings';

export function handleResponse(
  request: SearchRequest,
  response: IKibanaSearchResponse,
  { disableShardFailureWarning }: SearchSourceSearchOptions,
  theme: ThemeServiceStart
) {
  const { rawResponse } = response;

  // display warning toast notifications for timeouts and/or shard failures
  const warnings = extractWarnings(rawResponse);

  const timedOut = warnings.find((w) => w.isTimeout === true);
  if (timedOut) {
    getNotifications().toasts.addWarning({ title: timedOut.message });
  }

  const shardFailures = warnings.filter((w) => w.isShardFailure === true);
  if (shardFailures && !disableShardFailureWarning) {
    shardFailures.forEach((w) => {
      const title = w.message;
      const text = toMountPoint(
        <>
          {w.text}
          <EuiSpacer size="s" />
          <ShardFailureOpenModalButton
            request={request.body}
            response={rawResponse}
            theme={theme}
            title={title}
          />
        </>,
        { theme$: theme.theme$ }
      );

      getNotifications().toasts.addWarning({ title, text });
    });
  }

  return response;
}
