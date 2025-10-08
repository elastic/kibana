/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as mappings from './mappings';

const testCases = Object.entries(mappings).sort(([a], [b]) => a.localeCompare(b));

test.each(testCases)(
  'Snapshot for %s mapping helper, do not change lightly or risk changing live mappings!',
  (name, fn) => {
    expect(fn()).toMatchSnapshot();
  }
);
