/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DASHBOARD_API_PATH, DASHBOARD_API_VERSION } from '../../common/constants';

const DEFAULT_FILENAME_BASE = 'export';

function normalizeExtension(ext: string): string {
  const trimmed = ext.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

function sanitizeFilenameBase(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_FILENAME_BASE;

  return (
    trimmed
      .replace(/[\u0000-\u001F\u007F]/g, '') // remove control characters
      .replace(/[\\/:*?"<>|]/g, '_') // replace invalid characters
      .replace(/\s+/g, ' ') // collapse whitespace
      .trim() // trim whitespace
      .slice(0, 180) || // limit length
    DEFAULT_FILENAME_BASE // fallback to default
  );
}

export function buildExportJsonFilename(filenameBase: string, fileExtension: string): string {
  return `${sanitizeFilenameBase(filenameBase)}${normalizeExtension(fileExtension)}`;
}

/**
 * Builds a Dev Tools Console request string for creating a dashboard via the dashboards API.
 * The console will open with the HTTP verb + kbn: path, followed by a JSON body.
 */
export function buildCreateDashboardRequestForConsole(jsonBody: string): string {
  // TODO remove these conditionals once the dashboard endpoints are public
  // adds the `apiVersion` query parameter to the dashboard API path for internal requests
  const dashboardApiPath =
    DASHBOARD_API_VERSION === '1'
      ? `${DASHBOARD_API_PATH}?apiVersion=${DASHBOARD_API_VERSION}`
      : DASHBOARD_API_PATH;
  return `POST kbn:${dashboardApiPath}\n${jsonBody}`;
}
