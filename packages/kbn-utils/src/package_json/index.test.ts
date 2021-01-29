/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import path from 'path';
import { kibanaPackageJSON } from './';

it('parses package.json', () => {
  expect(kibanaPackageJSON.name).toEqual('kibana');
});

it('includes __dirname and __filename', () => {
  const root = path.resolve(__dirname, '../../../../');
  expect(kibanaPackageJSON.__filename).toEqual(path.resolve(root, 'package.json'));
  expect(kibanaPackageJSON.__dirname).toEqual(root);
});
