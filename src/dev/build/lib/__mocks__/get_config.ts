/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { REPO_ROOT } from '@kbn/repo-info';
import { Config } from '../config';

export function getMockConfig() {
  return new Config(
    true,
    false,
    {
      version: '8.0.0',
      engines: {
        node: '*',
      },
      workspaces: {
        packages: [],
      },
    } as any,
    '1.2.3',
    REPO_ROOT,
    {
      buildNumber: 1234,
      buildSha: 'abcd1234',
      buildShaShort: 'abcd',
      buildVersion: '8.0.0',
      buildDate: '2023-05-15T23:12:09.000Z',
    },
    false,
    false,
    null,
    '',
    '',
    false,
    true,
    true,
    {},
    {}
  );
}
