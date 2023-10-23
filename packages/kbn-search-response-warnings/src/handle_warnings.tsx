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
import type { NotificationsStart, ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { Start as InspectorStart, RequestAdapter } from '@kbn/inspector-plugin/public';
import {
  SearchResponseIncompleteWarning,
  SearchResponseWarning,
  WarningHandlerCallback,
} from './types';
import { extractWarnings } from './extract_warnings';
import { ViewWarningButton } from './components/view_warning_button';

interface Services {
  i18n: I18nStart;
  inspector: InspectorStart;
  notifications: NotificationsStart;
  theme: ThemeServiceStart;
}

/**
 * @internal
 * All warnings are expected to come from the same response.
 */
export function handleWarnings({
  callback,
  request,
  requestId,
  requestAdapter,
  response,
  services,
}: {
  callback?: WarningHandlerCallback;
  request: estypes.SearchRequest;
  requestAdapter: RequestAdapter;
  requestId?: string;
  response: estypes.SearchResponse;
  services: Services;
}) {
  const warnings = extractWarnings(response, services.inspector, requestAdapter, requestId);
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
  services.notifications.toasts.addWarning({
    title: incompleteWarning.message,
    text: toMountPoint(
      <EuiTextAlign textAlign="right">
        <ViewWarningButton onClick={incompleteWarning.openInInspector} />
      </EuiTextAlign>,
      { theme: services.theme, i18n: services.i18n }
    ),
  });
}

/**
 * @internal
 */
function filterWarnings(
  warnings: SearchResponseWarning[],
  cb: WarningHandlerCallback,
  request: estypes.SearchRequest,
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
