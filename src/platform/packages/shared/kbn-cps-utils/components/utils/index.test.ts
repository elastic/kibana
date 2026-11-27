/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getCSPLabel } from '.';

describe('getCSPLabel', () => {
  it.each([
    ['aws', 'AWS'],
    ['azure', 'Azure'],
    ['gcp', 'GCP'],
  ])('labels %s as "%s"', (csp, expected) => {
    expect(getCSPLabel(csp)).toBe(expected);
  });

  it('is case-insensitive', () => {
    expect(getCSPLabel('AWS')).toBe('AWS');
    expect(getCSPLabel('Azure')).toBe('Azure');
    expect(getCSPLabel('GCP')).toBe('GCP');
  });

  it('upper-cases a provider it does not know', () => {
    expect(getCSPLabel('oci')).toBe('OCI');
  });
});
