/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { DASHBOARD_APP_ID } from '../../../common/page_bundle_constants';

type RequestHeaders = Record<string, string | string[] | undefined>;

const X_KBN_CONTEXT_HEADER = 'x-kbn-context';

function getHeaderValue(headers: RequestHeaders, headerName: string): string | undefined {
  const value = headers[headerName];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export function parseXKbnContext(headers: RequestHeaders): KibanaExecutionContext | undefined {
  const raw = getHeaderValue(headers, X_KBN_CONTEXT_HEADER);
  if (!raw) return undefined;
  try {
    return JSON.parse(decodeURIComponent(raw)) as KibanaExecutionContext;
  } catch {
    return undefined;
  }
}

export function isDashboardUiRequest(headers: RequestHeaders): boolean {
  const ctx = parseXKbnContext(headers);
  return ctx?.type === 'application' && ctx?.name === DASHBOARD_APP_ID;
}
