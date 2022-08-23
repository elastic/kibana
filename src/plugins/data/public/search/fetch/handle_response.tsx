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
import type { SearchRequest, SearchResponseWarning } from '..';
import { IKibanaSearchResponse, SearchSourceSearchOptions } from '../../../common';
import { getNotifications } from '../../services';
import { ShardFailureOpenModalButton } from '../../shard_failure_modal';
import { extractWarnings } from './extract_warnings';

/**
 * A callback function which can intercept warnings when passed to {@link showWarnings}. Pass `true` from the
 * function to prevent the search service from showing warning notifications by default.
 * @public
 */
export type WarningHandlerCallback = (warnings: SearchResponseWarning) => boolean | undefined;

/**
 * @internal
 */
export function handleResponse(
  request: SearchRequest,
  response: IKibanaSearchResponse,
  { disableShardFailureWarning }: SearchSourceSearchOptions,
  cb: WarningHandlerCallback | undefined,
  theme: ThemeServiceStart
) {
  const { rawResponse } = response;

  // display warning toast notifications for timeouts and/or shard failures
  const warnings = extractWarnings(rawResponse);
  warnings.forEach((warning) => {
    const handled = cb && cb(warning);
    if (!handled) {
      if (warning.isTimeout) {
        getNotifications().toasts.addWarning({ title: warning.message });
      }

      if (warning.isShardFailure && !disableShardFailureWarning) {
        const title = warning.message;
        const text = toMountPoint(
          <>
            {warning.text}
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
    }
  });

  return response;
}
