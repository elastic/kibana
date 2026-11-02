/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPageLoadTransactionName } from './get_page_load_transaction_name';

describe('getPageLoadTransactionName', () => {
  it('returns /app/{appId} for deep app routes', () => {
    expect(getPageLoadTransactionName('/app/apm/services/my-service/overview')).toBe('/app/apm');
  });

  it('returns /app/{appId} for an already-normalized app route', () => {
    expect(getPageLoadTransactionName('/app/dashboards')).toBe('/app/dashboards');
  });

  it('ignores a server/space base-path prefix when resolving the app id', () => {
    expect(getPageLoadTransactionName('/s/my-space/app/apm/services/my-service')).toBe('/app/apm');
    expect(getPageLoadTransactionName('/mybasepath/app/discover')).toBe('/app/discover');
  });

  it('stops the app id at query and hash delimiters', () => {
    expect(getPageLoadTransactionName('/app/dashboards?foo=bar')).toBe('/app/dashboards');
    expect(getPageLoadTransactionName('/app/discover#/view/123')).toBe('/app/discover');
  });

  it('returns the pathname for non-app routes', () => {
    expect(getPageLoadTransactionName('/login')).toBe('/login');
  });

  it('returns the pathname unchanged for the root route', () => {
    expect(getPageLoadTransactionName('/')).toBe('/');
  });
});
