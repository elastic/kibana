/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiTextAlign } from '@elastic/eui';
import { estypes } from '@elastic/elasticsearch';
import { ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import { SearchRequest } from '..';
import { getNotifications } from '../../services';
import type { IInspectorInfo } from '../../../common/search/search_source';
import {
  SearchResponseIncompleteWarning,
  SearchResponseWarning,
  WarningHandlerCallback,
} from '../types';
import { extractWarnings } from './extract_warnings';
import { ViewWarningButton } from './view_warning_button';

/**
 * @internal
 * All warnings are expected to come from the same response.
 */
export function handleWarnings({
  request,
  response,
  theme,
  callback,
  requestId,
  inspector,
  inspectorService,
}: {
  request: SearchRequest;
  response: estypes.SearchResponse;
  theme: ThemeServiceStart;
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
    text: toMountPoint(
      <EuiTextAlign textAlign="right">
        <ViewWarningButton onClick={incompleteWarning.openInInspector} />
      </EuiTextAlign>,
      { theme$: theme.theme$ }
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
