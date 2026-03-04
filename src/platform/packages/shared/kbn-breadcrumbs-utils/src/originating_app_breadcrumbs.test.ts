/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getOriginatingAppBreadcrumbs } from './originating_app_breadcrumbs';

describe('getOriginatingAppBreadcrumbs', () => {
  const navigateToApp = jest.fn();

  const defaults = {
    originatingApp: 'dashboards',
    originatingPath: '#/view/abc123',
    breadcrumbTitle: 'My Dashboard',
    navigateToApp,
  };

  beforeEach(() => navigateToApp.mockReset());

  it.each([
    { field: 'breadcrumbTitle' },
    { field: 'originatingApp' },
    { field: 'originatingPath' },
  ])('returns [] when $field is missing', ({ field }) => {
    expect(getOriginatingAppBreadcrumbs({ ...defaults, [field]: undefined })).toEqual([]);
  });

  it('returns two breadcrumbs using originatingAppName when provided', () => {
    const result = getOriginatingAppBreadcrumbs({ ...defaults, originatingAppName: 'Dashboards' });
    expect(result.map((b) => b.text)).toEqual(['Dashboards', 'My Dashboard']);
  });

  it('derives listing path by dropping the last segment', () => {
    getOriginatingAppBreadcrumbs(defaults)[0].onClick!({} as React.MouseEvent<HTMLAnchorElement>);
    expect(navigateToApp).toHaveBeenCalledWith('dashboards', { path: '#/view' });
  });

  it('navigates without path when the path has only one segment after hash', () => {
    getOriginatingAppBreadcrumbs({ ...defaults, originatingPath: '#/list' })[0].onClick!(
      {} as React.MouseEvent<HTMLAnchorElement>
    );
    expect(navigateToApp).toHaveBeenCalledWith('dashboards', undefined);
  });

  it('trims trailing slashes before computing parent', () => {
    getOriginatingAppBreadcrumbs({ ...defaults, originatingPath: '#/view/abc123/' })[0].onClick!(
      {} as React.MouseEvent<HTMLAnchorElement>
    );
    expect(navigateToApp).toHaveBeenCalledWith('dashboards', { path: '#/view' });
  });
});
