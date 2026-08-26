/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  DEFAULT_DISCOVER_GRID_IMPLEMENTATION,
  getDiscoverGridImplementation,
  setDiscoverGridImplementation,
} from './discover_grid_implementation';

describe('discover grid implementation storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage(localStorage);
    storage.clear();
  });

  it('defaults to TanStack grid when no preference is stored', () => {
    expect(getDiscoverGridImplementation(storage)).toBe(DEFAULT_DISCOVER_GRID_IMPLEMENTATION);
  });

  it('persists classic grid selection in local storage', () => {
    setDiscoverGridImplementation(storage, 'unified');
    expect(getDiscoverGridImplementation(storage)).toBe('unified');
  });

  it('persists TanStack grid selection in local storage', () => {
    setDiscoverGridImplementation(storage, 'unified');
    setDiscoverGridImplementation(storage, 'tanstack');
    expect(getDiscoverGridImplementation(storage)).toBe('tanstack');
  });

  it('ignores invalid stored values', () => {
    localStorage.setItem('discover:discoverGridImplementation', JSON.stringify('invalid'));
    expect(getDiscoverGridImplementation(storage)).toBe(DEFAULT_DISCOVER_GRID_IMPLEMENTATION);
  });
});
