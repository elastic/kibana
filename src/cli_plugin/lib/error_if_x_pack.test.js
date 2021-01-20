/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { errorIfXPackInstall, errorIfXPackRemove } from './error_if_x_pack';

describe('error_if_xpack', () => {
  it('should error on install if x-pack by name', () => {
    expect(() => errorIfXPackInstall({ plugin: 'x-pack' })).toThrow();
  });

  it('should error on install if x-pack by url', () => {
    expect(() =>
      errorIfXPackInstall({
        plugin: 'http://localhost/x-pack/x-pack-7.0.0-alpha1-SNAPSHOT.zip',
      })
    ).toThrow();
  });

  it('should not error on install if not x-pack', () => {
    expect(() =>
      errorIfXPackInstall({
        plugin: 'foo',
      })
    ).not.toThrow();
  });

  it('should error on remove if x-pack', () => {
    expect(() => errorIfXPackRemove({ plugin: 'x-pack' })).toThrow();
  });

  it('should not error on remove if not x-pack', () => {
    expect(() => errorIfXPackRemove({ plugin: 'bar' })).not.toThrow();
  });
});
