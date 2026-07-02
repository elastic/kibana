/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveCrossAppHashNavigationUrl } from './cross_app_hash_navigation';

describe('resolveCrossAppHashNavigationUrl', () => {
  it('rewrites dashboard hash routes on discover pathname', () => {
    const url = new URL('http://localhost:5601/app/discover#/list');

    expect(resolveCrossAppHashNavigationUrl(url)).toBe(
      'http://localhost:5601/app/dashboards#/list'
    );
  });

  it('rewrites dashboard view hash routes on discover pathname', () => {
    const url = new URL('http://localhost:5601/app/discover#/view/dashboard-id');

    expect(resolveCrossAppHashNavigationUrl(url)).toBe(
      'http://localhost:5601/app/dashboards#/view/dashboard-id'
    );
  });

  it('returns undefined for discover hash routes', () => {
    const url = new URL('http://localhost:5601/app/discover#/viewAlert/alert-id');

    expect(resolveCrossAppHashNavigationUrl(url)).toBeUndefined();
  });

  it('returns undefined when pathname is already dashboards', () => {
    const url = new URL('http://localhost:5601/app/dashboards#/list');

    expect(resolveCrossAppHashNavigationUrl(url)).toBeUndefined();
  });
});
