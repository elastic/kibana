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
import { SearchResponseWarning, WarningHandlerCallback } from '../types';
import { extractWarnings } from './extract_warnings';

/**
 * @internal
 * All warnings are expected to come from the same response. Therefore all "text" properties, which contain the
 * response, will be the same.
 */
export function handleWarnings(
  request: SearchRequest,
  response: estypes.SearchResponse,
  theme: ThemeServiceStart,
  cb?: WarningHandlerCallback
) {
  const warnings = extractWarnings(response);
  if (warnings.length === 0) {
    return;
  }

  let internal: SearchResponseWarning[] = [];
  if (cb) {
    internal = filterWarnings(warnings, cb);
  } else {
    internal = warnings;
  }

  if (internal.length === 0) {
    return;
  }

  const [warning] = internal;
  const title = warning.message;

  // if warning message contains text (warning response), show in ShardFailureOpenModalButton
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

/**
 * @internal
 */
export function filterWarnings(warnings: SearchResponseWarning[], cb: WarningHandlerCallback) {
  const unfiltered: SearchResponseWarning[] = [];

  // use the consumer's callback as a filter to receive warnings to handle on our side
  warnings.forEach((warning) => {
    const consumerHandled = cb?.(warning);
    if (!consumerHandled) {
      unfiltered.push(warning);
    }
  });

  return unfiltered;
}
