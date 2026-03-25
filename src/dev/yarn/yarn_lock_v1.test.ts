/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseYarnLock } from './yarn_lock_v1';

describe('parseYarnLock', () => {
  it('parses dependency versions that contain spaces and comparators', () => {
    const lockfile = `
stylis-plugin-rtl@>=2.1.0:
  version "2.1.1"
  dependencies:
    cssjanus ">=1.3.2"
    stylis "4.x"

cssjanus@>=1.3.2:
  version "2.3.0"

stylis@4.x:
  version "4.3.6"
`;

    expect(parseYarnLock(lockfile)).toMatchObject({
      'stylis-plugin-rtl@2.1.1': {
        dependencies: {
          cssjanus: '>=1.3.2',
          stylis: '4.x',
        },
      },
    });
  });

  it('includes optionalDependencies in the parsed dependency map', () => {
    const lockfile = `
wrapper@^1.0.0:
  version "1.0.0"
  optionalDependencies:
    native-thing "^2.0.0"

native-thing@^2.0.0:
  version "2.1.0"
`;

    expect(parseYarnLock(lockfile)).toMatchObject({
      'wrapper@1.0.0': {
        dependencies: {
          'native-thing': '^2.0.0',
        },
      },
    });
  });

  it('merges duplicate lock entries for the same resolved package', () => {
    const lockfile = `
shared@^1.0.0:
  version "1.2.3"

shared@~1.2.0:
  version "1.2.3"
`;

    expect(parseYarnLock(lockfile)).toEqual({
      'shared@1.2.3': {
        name: 'shared',
        requestedVersions: ['^1.0.0', '~1.2.0'],
        resolvedVersion: '1.2.3',
      },
    });
  });
});
