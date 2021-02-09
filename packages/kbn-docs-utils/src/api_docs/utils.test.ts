/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findPlugins } from './find_plugins';
import { getPluginForPath, getServiceForPath } from './utils';

it('test getPluginForPath', () => {
  const plugins = findPlugins();
  expect(
    getPluginForPath('/Users/auser/kibana/src/plugins/embeddable/public/service/file.ts', plugins)
  ).toBeDefined();
});

it('test getServiceForPath', () => {
  expect(getServiceForPath('src/plugins/embed/public/service/file.ts')).toBe('service');
  expect(getServiceForPath('src/plugins/embed/public/service/subfolder/file.ts')).toBe('service');
  expect(getServiceForPath('src/plugins/embed/public/file.ts')).toBeUndefined();
  expect(getServiceForPath('src/plugins/embed/server/another_service/file.ts')).toBe(
    'another_service'
  );
  expect(getServiceForPath('src/plugins/embed/server/f.ts')).toBeUndefined();
});

// it('getRelativeKibanaPath', () => {
//   let relativePath = getRelativeKibanaPath(
//     '/tmp/tmp-5631-rv2QP2a7ISWH/x-pack/plugins/server/authorization/ui'
//   );
//   expect(relativePath).toBe('x-pack/plugins/server/authorization/ui');

//   relativePath = getRelativeKibanaPath(
//     '/tmp/tmp-5631-rv2QP2a7ISWH/src/plugins/server/authorization/ui'
//   );
//   expect(relativePath).toBe('src/plugins/server/authorization/ui');

//   relativePath = getRelativeKibanaPath('/tmp/tmp-5631-rv2QP2a7ISWH/examples/test');
//   expect(relativePath).toBe('examples/test');
// });
