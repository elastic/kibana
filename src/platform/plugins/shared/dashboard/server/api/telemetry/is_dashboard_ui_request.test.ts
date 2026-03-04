/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isDashboardUiRequest, parseXKbnContext } from './is_dashboard_ui_request';

describe('dashboard api telemetry - isDashboardUiRequest', () => {
  it('returns true for Dashboard app execution context', () => {
    const header = encodeURIComponent(
      JSON.stringify({ type: 'application', name: 'dashboards', page: 'app', id: '123' })
    );
    expect(isDashboardUiRequest({ 'x-kbn-context': header })).toBe(true);
  });

  it('returns false for other application execution context', () => {
    const header = encodeURIComponent(JSON.stringify({ type: 'application', name: 'discover' }));
    expect(isDashboardUiRequest({ 'x-kbn-context': header })).toBe(false);
  });

  it('returns false when header is missing or malformed', () => {
    expect(isDashboardUiRequest({})).toBe(false);
    expect(isDashboardUiRequest({ 'x-kbn-context': '%E0%A4%A' })).toBe(false);
  });

  it('parseXKbnContext returns undefined for malformed header', () => {
    expect(parseXKbnContext({ 'x-kbn-context': '%E0%A4%A' })).toBeUndefined();
  });
});
