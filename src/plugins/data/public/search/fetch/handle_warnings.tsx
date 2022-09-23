/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { debounce } from 'lodash';
import { EuiSpacer } from '@elastic/eui';
import { ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { SearchRequest } from '..';
import { getNotifications } from '../../services';
import { ShardFailureOpenModalButton, ShardFailureRequest } from '../../shard_failure_modal';
import {
  SearchResponseShardFailureWarning,
  SearchResponseWarning,
  WarningHandlerCallback,
} from '../types';
import { extractWarnings } from './extract_warnings';

const getDebouncedWarning = () => {
  const addWarning = () => debounce(getNotifications().toasts.addWarning, 10000, { leading: true });
  const memory: Record<string, ReturnType<typeof addWarning>> = {};

  return (title: string) => {
    memory[title] = memory[title] || addWarning();
    return memory[title]({ title });
  };
};

const debouncedWarning = getDebouncedWarning();
const debouncedTimeoutWarning = getDebouncedWarning();

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

  const internal = cb ? filterWarnings(warnings, cb) : warnings;
  if (internal.length === 0) {
    return;
  }

  // timeout notification
  const [timeout] = internal.filter((w) => w.type === 'timed_out');
  if (timeout) {
    debouncedTimeoutWarning(timeout.message);
  }

  // shard warning failure notification
  const shardFailures = internal.filter((w) => w.type === 'shard_failure');
  if (shardFailures.length === 0) {
    return;
  }

  const [warning] = shardFailures as SearchResponseShardFailureWarning[];
  const title = warning.message;

  // todo debounce on title, text, response._shards.failures, request, response
  // ask lukas if it makes sense to debounce on the whole response and request
  // if warning message contains text (warning response), show in ShardFailureOpenModalButton
  if (warning.text) {
    const text = toMountPoint(
      <>
        {warning.text}
        <EuiSpacer size="s" />
        <ShardFailureOpenModalButton
          request={request as ShardFailureRequest}
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
  debouncedWarning(title);
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
