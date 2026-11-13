/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRegionLabel } from './cloud_regions';

describe('getRegionLabel', () => {
  it.each([
    ['aws', 'eu-west-1', 'Ireland (eu-west-1)'],
    ['aws', 'us-east-1', 'N. Virginia (us-east-1)'],
    ['azure', 'eastus', 'Virginia (eastus)'],
    ['azure', 'eastus2', 'Virginia (eastus2)'],
    ['gcp', 'us-central1', 'Iowa (us-central1)'],
    ['gcp', 'europe-west1', 'Belgium (europe-west1)'],
  ])('labels %s region %s as "%s"', (csp, region, expected) => {
    expect(getRegionLabel(csp, region)).toBe(expected);
  });

  it('ignores a leading provider prefix on the region', () => {
    expect(getRegionLabel('aws', 'aws-eu-west-1')).toBe('Ireland (eu-west-1)');
    expect(getRegionLabel('azure', 'azure-eastus')).toBe('Virginia (eastus)');
    expect(getRegionLabel('gcp', 'gcp-us-central1')).toBe('Iowa (us-central1)');
  });

  it('is case-insensitive for both the provider and the region', () => {
    expect(getRegionLabel('AWS', 'EU-WEST-1')).toBe('Ireland (eu-west-1)');
    expect(getRegionLabel('Azure', 'EastUS')).toBe('Virginia (eastus)');
  });

  it('returns the bare region code when the location of the region is unknown', () => {
    expect(getRegionLabel('aws', 'af-south-1')).toBe('af-south-1');
  });

  it('drops the provider prefix from a region of unknown location', () => {
    expect(getRegionLabel('aws', 'aws-af-south-1')).toBe('af-south-1');
  });

  it('returns the bare region code for an unknown provider', () => {
    expect(getRegionLabel('oci', 'eu-west-1')).toBe('eu-west-1');
  });

  it('does not look a region up under a different provider', () => {
    expect(getRegionLabel('azure', 'eu-west-1')).toBe('eu-west-1');
  });

  it('does not mistake properties inherited from objects for regions', () => {
    expect(getRegionLabel('aws', 'constructor')).toBe('constructor');
    expect(getRegionLabel('constructor', 'eu-west-1')).toBe('eu-west-1');
  });
});
