/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { getPackages, getPluginPackagesFilter } from '..';

const repoRoot = Path.resolve(__dirname, '../../../../../..');

it('loads a relocated test plugin only when its path is explicitly requested', () => {
  const plugin = getPackages(repoRoot).find(
    ({ id }) => id === '@kbn/kbn-tp-custom-visualizations-plugin'
  );
  if (!plugin) {
    throw new Error('Custom visualizations test plugin was not discovered');
  }

  expect(plugin.getPluginCategories().testPlugin).toBe(true);
  expect(getPluginPackagesFilter()(plugin)).toBe(false);
  expect(getPluginPackagesFilter({ paths: [plugin.directory] })(plugin)).toBe(true);
});
