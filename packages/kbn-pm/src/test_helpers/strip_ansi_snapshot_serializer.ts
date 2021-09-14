/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import hasAnsi from 'has-ansi';
import stripAnsi from 'strip-ansi';

export const stripAnsiSnapshotSerializer: jest.SnapshotSerializerPlugin = {
  serialize(value: string) {
    return stripAnsi(value);
  },

  test(value: any) {
    return typeof value === 'string' && hasAnsi(value);
  },
};
