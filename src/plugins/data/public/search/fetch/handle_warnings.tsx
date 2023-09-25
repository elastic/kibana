/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { estypes } from '@elastic/elasticsearch';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import { SearchRequest } from '..';
import { getNotifications } from '../../services';
import {
  SearchResponseIncompleteWarning,
  SearchResponseWarning,
  WarningHandlerCallback,
} from '../types';
import { extractWarnings } from './extract_warnings';

/**
 * @internal
 * All warnings are expected to come from the same response.
 */
export function handleWarnings({
  request,
  response,
  callback,
  requestId,
  inspector,
  inspectorService,
}: {
  request: SearchRequest;
  response: estypes.SearchResponse;
  callback?: WarningHandlerCallback;
  requestId?: string;
  inspector?: IInspectorInfo;
  inspectorService: InspectorStartContract;
}) {
  const warnings = extractWarnings(response, inspectorService, inspector);
  if (warnings.length === 0) {
    return;
  }

  const internal = callback
    ? filterWarnings(warnings, callback, request, response, requestId)
    : warnings;
  if (internal.length === 0) {
    return;
  }

  // Incomplete data failure notification
  const incompleteWarnings = internal.filter((w) => w.type === 'incomplete');
  if (incompleteWarnings.length === 0) {
    return;
  }

  const [incompleteWarning] = incompleteWarnings as SearchResponseIncompleteWarning[];
  getNotifications().toasts.addWarning({
    title: incompleteWarning.message,
    text: (
      <EuiButton
        color="warning"
        size="s"
        onClick={incompleteWarning.openInInspector}
        data-test-subj="openInInspector"
      >
        <FormattedMessage
          id="data.search.searchSource.fetch.incompleteResultsWarning.viewDetails"
          defaultMessage="View details"
          description="Open inspector to show details"
        />
      </EuiButton>
    ),
  });
}

/**
 * @internal
 */
export function filterWarnings(
  warnings: SearchResponseWarning[],
  cb: WarningHandlerCallback,
  request: SearchRequest,
  response: estypes.SearchResponse,
  requestId: string | undefined
) {
  const unfiltered: SearchResponseWarning[] = [];

  // use the consumer's callback as a filter to receive warnings to handle on our side
  warnings.forEach((warning) => {
    const consumerHandled = cb?.(warning, {
      requestId,
      request,
      response,
    });
    if (!consumerHandled) {
      unfiltered.push(warning);
    }
  });

  return unfiltered;
}
