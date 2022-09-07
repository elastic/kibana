/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { appendAppPath } from './append_app_path';

describe('appendAppPath', () => {
  it('appends the appBasePath with given path', () => {
    expect(appendAppPath('/app/my-app', '/some-path')).toEqual('/app/my-app/some-path');
    expect(appendAppPath('/app/my-app/', 'some-path')).toEqual('/app/my-app/some-path');
    expect(appendAppPath('/app/my-app', 'some-path')).toEqual('/app/my-app/some-path');
    expect(appendAppPath('/app/my-app', '')).toEqual('/app/my-app');
  });

  it('preserves the trailing slash only if included in the hash or appPath', () => {
    expect(appendAppPath('/app/my-app', '/some-path/')).toEqual('/app/my-app/some-path');
    expect(appendAppPath('/app/my-app', '/some-path#/')).toEqual('/app/my-app/some-path#/');
    expect(appendAppPath('/app/my-app#/', '')).toEqual('/app/my-app#/');
    expect(appendAppPath('/app/my-app#', '/')).toEqual('/app/my-app#/');
    expect(appendAppPath('/app/my-app', '/some-path#/hash/')).toEqual(
      '/app/my-app/some-path#/hash/'
    );
    expect(appendAppPath('/app/my-app', '/some-path#/hash')).toEqual('/app/my-app/some-path#/hash');
  });
});
