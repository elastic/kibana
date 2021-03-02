/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { kibanaPackageJson } from './';

it('parses package.json', () => {
  expect(kibanaPackageJson.name).toEqual('kibana');
});

it('includes __dirname and __filename', () => {
  const root = path.resolve(__dirname, '../../../../');
  expect(kibanaPackageJson.__filename).toEqual(path.resolve(root, 'package.json'));
  expect(kibanaPackageJson.__dirname).toEqual(root);
});
