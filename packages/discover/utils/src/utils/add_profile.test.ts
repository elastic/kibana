/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { addProfile } from './add_profile';

describe('addProfile', () => {
  it('should add profile to path', () => {
    expect(addProfile('/root', 'test')).toEqual('/root/p/test');
  });

  it('should add profile to path with trailing slash', () => {
    expect(addProfile('/root/', 'test')).toEqual('/root/p/test/');
  });

  it('should trim path', () => {
    expect(addProfile(' /root ', 'test')).toEqual('/root/p/test');
  });

  it('should work with empty path', () => {
    expect(addProfile('', 'test')).toEqual('/p/test');
  });
});
