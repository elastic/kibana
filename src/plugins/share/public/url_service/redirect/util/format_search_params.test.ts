/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { formatSearchParams } from './format_search_params';
import { parseSearchParams } from './parse_search_params';

test('can format typical locator settings as URL path search params', () => {
  const search = formatSearchParams({
    id: 'LOCATOR_ID',
    version: '7.21.3',
    params: {
      dashboardId: '123',
      mode: 'edit',
    },
  });

  expect(search.get('l')).toBe('LOCATOR_ID');
  expect(search.get('v')).toBe('7.21.3');
  expect(JSON.parse(search.get('p')!)).toEqual({
    dashboardId: '123',
    mode: 'edit',
  });
});

test('can format and then parse redirect options', () => {
  const options = {
    id: 'LOCATOR_ID',
    version: '7.21.3',
    params: {
      dashboardId: '123',
      mode: 'edit',
    },
  };
  const formatted = formatSearchParams(options);
  const parsed = parseSearchParams(formatted.toString());

  expect(parsed).toEqual(options);
});
