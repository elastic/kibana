/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getParsedVersion } from './get_parsed_version';

describe('getParsedVersion', () => {
  test('parses a version string', () => {
    expect(getParsedVersion('1.2.3')).toEqual({
      version_str: '1.2.3',
      version_major_int: 1,
      version_minor_int: 2,
      version_patch_int: 3,
    });
  });

  test('parses a version string with extra label', () => {
    expect(getParsedVersion('1.2.3-SNAPSHOT')).toEqual({
      version_str: '1.2.3-SNAPSHOT',
      version_major_int: 1,
      version_minor_int: 2,
      version_patch_int: 3,
    });
  });

  test('does not throw for invalid version', () => {
    expect(getParsedVersion('INVALID_VERSION')).toEqual({
      version_str: 'INVALID_VERSION',
      version_major_int: NaN,
      version_minor_int: NaN,
      version_patch_int: NaN,
    });
  });
});
