/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isVirtualModelVersion,
  virtualVersionToModelVersion,
  assertValidVirtualVersion,
} from './conversion';

describe('isVirtualModelVersion', () => {
  it('returns true when the version is a virtual model version', () => {
    expect(isVirtualModelVersion('10.0.0')).toEqual(true);
    expect(isVirtualModelVersion('10.7.0')).toEqual(true);
    expect(isVirtualModelVersion('10.12.0')).toEqual(true);
  });

  it('returns false when the version is not a virtual model version', () => {
    expect(isVirtualModelVersion('9.2.0')).toEqual(false);
    expect(isVirtualModelVersion('10.7.1')).toEqual(false);
    expect(isVirtualModelVersion('11.2.0')).toEqual(false);
  });

  it('throws when the version is not a valid semver', () => {
    expect(() => isVirtualModelVersion('9.-2.0')).toThrowErrorMatchingInlineSnapshot(
      `"Invalid semver: 9.-2.0"`
    );
    expect(() => isVirtualModelVersion('12.3.5.6.7')).toThrowErrorMatchingInlineSnapshot(
      `"Invalid semver: 12.3.5.6.7"`
    );
    expect(() => isVirtualModelVersion('dolly')).toThrowErrorMatchingInlineSnapshot(
      `"Invalid semver: dolly"`
    );
  });
});

describe('virtualVersionToModelVersion', () => {
  it('converts the given virtual version to its model version', () => {
    expect(virtualVersionToModelVersion('10.0.0')).toEqual(0);
    expect(virtualVersionToModelVersion('10.7.0')).toEqual(7);
    expect(virtualVersionToModelVersion('10.12.0')).toEqual(12);
  });

  it('throws when the version is not a virtual model version', () => {
    expect(() => virtualVersionToModelVersion('9.2.0')).toThrowErrorMatchingInlineSnapshot(
      `"Version is not a virtual model version"`
    );
    expect(() => virtualVersionToModelVersion('11.3.0')).toThrowErrorMatchingInlineSnapshot(
      `"Version is not a virtual model version"`
    );
    expect(() => virtualVersionToModelVersion('10.3.42')).toThrowErrorMatchingInlineSnapshot(
      `"Version is not a virtual model version"`
    );
  });

  it('throws when the version is not a valid semver', () => {
    expect(() => virtualVersionToModelVersion('9.-2.0')).toThrowErrorMatchingInlineSnapshot(
      `"Invalid semver: 9.-2.0"`
    );
    expect(() => virtualVersionToModelVersion('12.3.5.6.7')).toThrowErrorMatchingInlineSnapshot(
      `"Invalid semver: 12.3.5.6.7"`
    );
    expect(() => virtualVersionToModelVersion('dolly')).toThrowErrorMatchingInlineSnapshot(
      `"Invalid semver: dolly"`
    );
  });
});

describe('assertValidVirtualVersion', () => {
  it('throws if the provided value is not a valid semver', () => {
    expect(() => assertValidVirtualVersion('foooo')).toThrowErrorMatchingInlineSnapshot(
      `"Virtual versions must be valid semver versions"`
    );
    expect(() => assertValidVirtualVersion('1.2.3.4.5.6.7')).toThrowErrorMatchingInlineSnapshot(
      `"Virtual versions must be valid semver versions"`
    );
  });

  it('returns the virtual version', () => {
    expect(assertValidVirtualVersion('7.17.5')).toEqual('7.17.5');
    expect(assertValidVirtualVersion('10.3.0')).toEqual('10.3.0');
  });
});
