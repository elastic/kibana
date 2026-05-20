/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateHumanReadableId } from './generate_human_readable_id';

describe('generateHumanReadableId', () => {
  it('should derive a slug from the name', () => {
    expect(generateHumanReadableId('My Workflow')).toBe('my-workflow');
  });

  it('should fall back to id-{uuid} when name is undefined', () => {
    expect(generateHumanReadableId()).toMatch(/^id-[0-9a-f-]+$/);
  });

  it('should fall back to id-{uuid} when slug is too short', () => {
    expect(generateHumanReadableId('ab')).toMatch(/^id-[0-9a-f-]+$/);
  });

  it('should fall back to id-{uuid} when name has only special characters', () => {
    expect(generateHumanReadableId('!!!')).toMatch(/^id-[0-9a-f-]+$/);
  });

  it('should strip diacritics and produce a valid slug', () => {
    expect(generateHumanReadableId('Alerte Sécurité')).toBe('alerte-securite');
  });

  it('should use a custom fallback prefix when provided', () => {
    expect(generateHumanReadableId(undefined, { fallbackPrefix: 'workflow' })).toMatch(
      /^workflow-[0-9a-f-]+$/
    );
  });

  it('should use a custom fallback prefix for invalid slugs', () => {
    expect(generateHumanReadableId('ab', { fallbackPrefix: 'connector' })).toMatch(
      /^connector-[0-9a-f-]+$/
    );
  });
});
