/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { removeQueryParam } from './remove_query_param';
import { createMemoryHistory, Location } from 'history';

describe('removeQueryParam', () => {
  it('should remove query param from url', () => {
    const startLocation: Location<any> = {
      pathname: '/dashboard/c3a76790-3134-11ea-b024-83a7b4783735',
      search: "?_a=(description:'')&_b=3",
      state: null,
      hash: '',
    };

    const history = createMemoryHistory();
    history.push(startLocation);
    removeQueryParam(history, '_a');

    expect(history.location).toEqual(
      expect.objectContaining({
        pathname: '/dashboard/c3a76790-3134-11ea-b024-83a7b4783735',
        search: '?_b=3',
        state: null,
        hash: '',
      })
    );
  });

  it('should not fail if nothing to remove', () => {
    const startLocation: Location<any> = {
      pathname: '/dashboard/c3a76790-3134-11ea-b024-83a7b4783735',
      search: "?_a=(description:'')&_b=3",
      state: null,
      hash: '',
    };

    const history = createMemoryHistory();
    history.push(startLocation);
    removeQueryParam(history, '_c');

    expect(history.location).toEqual(expect.objectContaining(startLocation));
  });

  it('should not fail if no search', () => {
    const startLocation: Location<any> = {
      pathname: '/dashboard/c3a76790-3134-11ea-b024-83a7b4783735',
      search: '',
      state: null,
      hash: '',
    };

    const history = createMemoryHistory();
    history.push(startLocation);
    removeQueryParam(history, '_c');

    expect(history.location).toEqual(expect.objectContaining(startLocation));
  });
});
