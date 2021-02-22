/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { findPlugins } from './find_plugins';
import { getPluginForPath, getServiceForPath } from './utils';

it('test getPluginForPath', () => {
  const plugins = findPlugins();
  const path = Path.resolve(__dirname, '../../../../src/plugins/embeddable/public/service/file.ts');
  expect(getPluginForPath(path, plugins)).toBeDefined();
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
