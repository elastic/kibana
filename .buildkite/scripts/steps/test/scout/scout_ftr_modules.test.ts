/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SCOUT_EXCLUDED_MODULES, shouldSkipScoutTests } from './scout_ftr_modules';

describe('SCOUT_EXCLUDED_MODULES', () => {
  const SCOUT_DEPENDENCIES = [
    '@kbn/test-es-server',
    '@kbn/test-kibana-server',
    '@kbn/test-saml-auth',
    '@kbn/test-subj-selector',
    '@kbn/test-docker-servers',
    '@kbn/es-archiver',
  ];

  it('does not include any modules that @kbn/scout depends on', () => {
    for (const dep of SCOUT_DEPENDENCIES) {
      expect(SCOUT_EXCLUDED_MODULES.has(dep)).toBe(false);
    }
  });

  it('does not include Scout ecosystem modules', () => {
    const scoutEcosystem = [
      '@kbn/scout',
      '@kbn/scout-oblt',
      '@kbn/scout-search',
      '@kbn/scout-security',
      '@kbn/scout-synthtrace',
      '@kbn/scout-reporting',
    ];
    for (const id of scoutEcosystem) {
      expect(SCOUT_EXCLUDED_MODULES.has(id)).toBe(false);
    }
  });

  it('includes expected FTR core modules', () => {
    expect(SCOUT_EXCLUDED_MODULES.has('@kbn/test')).toBe(true);
    expect(SCOUT_EXCLUDED_MODULES.has('@kbn/ftr-common-functional-services')).toBe(true);
    expect(SCOUT_EXCLUDED_MODULES.has('@kbn/test-suites-src')).toBe(true);
  });
});

describe('shouldSkipScoutTests', () => {
  it('returns false for an empty set', () => {
    expect(shouldSkipScoutTests(new Set())).toBe(false);
  });

  it('returns true when all modules are excluded', () => {
    expect(shouldSkipScoutTests(new Set(['@kbn/test', '@kbn/test-suites-src']))).toBe(true);
  });

  it('returns true for a single excluded module', () => {
    expect(shouldSkipScoutTests(new Set(['@kbn/test']))).toBe(true);
  });

  it('returns false when any module is not in the excluded list', () => {
    expect(shouldSkipScoutTests(new Set(['@kbn/test', '@kbn/dashboard-plugin']))).toBe(false);
  });

  it('returns false for a Scout dependency module', () => {
    expect(shouldSkipScoutTests(new Set(['@kbn/test-saml-auth']))).toBe(false);
  });

  it('returns false for an unknown module', () => {
    expect(shouldSkipScoutTests(new Set(['@kbn/some-random-plugin']))).toBe(false);
  });
});
