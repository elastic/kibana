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
  const { timedOut, shardFailures } = extractWarnings(rawResponse);
  if (timedOut) {
    getNotifications().toasts.addWarning(timedOut);
  }

  if (shardFailures && !disableShardFailureWarning) {
    const title = shardFailures.title!;
    const text = toMountPoint(
      <>
        {shardFailures.text}
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
  }

  return response;
}
