/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ddToMGRS, mgrsToDD, ddToUTM, utmToDD, ddToDMS, withinRange } from './geo_utils';

describe('withinRange', () => {
  test('should accept numbers within the range, including the boundaries', () => {
    expect(withinRange(0, -90, 90).isInvalid).toBe(false);
    expect(withinRange(-90, -90, 90).isInvalid).toBe(false);
    expect(withinRange(90, -90, 90).isInvalid).toBe(false);
  });

  test('should accept numeric strings within the range', () => {
    expect(withinRange('42', -90, 90).isInvalid).toBe(false);
    expect(withinRange('-42.5', -90, 90).isInvalid).toBe(false);
  });

  test('should reject numbers outside of the range', () => {
    expect(withinRange(91, -90, 90).isInvalid).toBe(true);
    expect(withinRange(-91, -90, 90).isInvalid).toBe(true);
    expect(withinRange('91', -90, 90).isInvalid).toBe(true);
  });

  test('should reject empty values', () => {
    expect(withinRange('', -90, 90).isInvalid).toBe(true);
  });

  test('should reject values that are not finite numbers', () => {
    expect(withinRange('abc', -90, 90).isInvalid).toBe(true);
    expect(withinRange(NaN, -90, 90).isInvalid).toBe(true);
    expect(withinRange(Infinity, -90, 90).isInvalid).toBe(true);
    expect(withinRange(-Infinity, -90, 90).isInvalid).toBe(true);
  });

  test('should only return an error for invalid values', () => {
    expect(withinRange(0, -90, 90).error).toBeNull();
    expect(withinRange('abc', -90, 90).error).not.toBeNull();
  });
});

describe('DMS', () => {
  test('ddToDMS should convert lat lon to degrees minutes seconds', () => {
    expect(ddToDMS(37.774929, -122.419416)).toEqual('374629N,1222509W');
    expect(ddToDMS(-33.865143, 151.2099)).toEqual('335154S,1511235E');
  });

  test('ddToDMS should not mangle near-zero coordinates in exponential notation', () => {
    // parseInt(String(1e-7)) parses "1e-7" as 1; Math.trunc must yield 0
    expect(ddToDMS(1e-7, -1e-8)).toEqual('000000N,0000000W');
  });
});

describe('MGRS', () => {
  test('ddToMGRS should convert lat lon to MGRS', () => {
    expect(ddToMGRS(29.29926, 32.05495)).toEqual('36RVT08214151');
  });

  test('ddToMGRS should return empty string for lat lon that does not translate to MGRS grid', () => {
    expect(ddToMGRS(90, 32.05495)).toEqual('');
  });

  test('mgrsToDD should convert MGRS to lat lon', () => {
    expect(mgrsToDD('36RVT08214151')).toEqual({
      east: 32.05498649594143,
      north: 29.299330195900975,
      south: 29.299239224067065,
      west: 32.054884373627345,
    });
  });
});

describe('UTM', () => {
  test('ddToUTM should convert lat lon to UTM', () => {
    expect(ddToUTM(29.29926, 32.05495)).toEqual({
      easting: '408216',
      northing: '3241512',
      zone: '36R',
    });
  });

  test('ddToUTM should return empty strings for lat lon that does not translate to UTM grid', () => {
    expect(ddToUTM(90, 32.05495)).toEqual({
      northing: '',
      easting: '',
      zone: '',
    });
  });

  test('utmToDD should convert UTM to lat lon', () => {
    expect(utmToDD('3241512', '408216', '36R')).toEqual({
      lat: 29.29925770984472,
      lon: 32.05494597943409,
    });
  });
});
