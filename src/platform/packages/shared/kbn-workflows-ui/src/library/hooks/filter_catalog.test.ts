/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Template } from '@kbn/workflows-library';
import { filterCatalog } from './filter_catalog';

const buildTemplate = (overrides: Partial<Template> = {}): Template => ({
  slug: 'ip-reputation-check',
  version: '1.0.0',
  availability: '>=9.5.0',
  name: 'IP Reputation Check',
  description: 'Assess the reputation of an IP address.',
  categories: ['enrichment', 'threat-intel'],
  definitionUrl: 'templates/ip-reputation-check/1.0.0.yaml',
  contentHash: 'sha256:abc',
  stepTypes: ['abuseipdb.checkIp'],
  triggerTypes: ['manual'],
  ...overrides,
});

describe('filterCatalog', () => {
  it('returns all templates when no filters are provided', () => {
    const templates = [buildTemplate()];
    expect(filterCatalog(templates)).toEqual(templates);
  });

  it('matches free-text search against name, description, and categories', () => {
    const templates = [
      buildTemplate({ slug: 'a', name: 'Slack Notification' }),
      buildTemplate({ slug: 'b', name: 'Other', description: 'Uses slack under the hood' }),
      buildTemplate({ slug: 'c', name: 'Other', categories: ['notification'] }),
      buildTemplate({
        slug: 'd',
        name: 'Unrelated',
        description: 'nothing',
        categories: ['ai-agent'],
      }),
    ];

    expect(filterCatalog(templates, { search: 'slack' }).map((t) => t.slug)).toEqual(['a', 'b']);
    expect(filterCatalog(templates, { search: 'notification' }).map((t) => t.slug)).toEqual([
      'a',
      'c',
    ]);
  });

  it('is case-insensitive and trims whitespace for search', () => {
    const templates = [buildTemplate({ name: 'IP Reputation Check' })];
    expect(filterCatalog(templates, { search: '  ip reputation  ' })).toHaveLength(1);
  });

  it('matches templates whose categories intersect the filter', () => {
    const templates = [
      buildTemplate({ slug: 'a', categories: ['enrichment'] }),
      buildTemplate({ slug: 'b', categories: ['notification'] }),
      buildTemplate({ slug: 'c', categories: ['enrichment', 'notification'] }),
    ];

    expect(filterCatalog(templates, { categories: ['notification'] }).map((t) => t.slug)).toEqual([
      'b',
      'c',
    ]);
  });

  it('treats an empty categories filter as "no filter"', () => {
    const templates = [buildTemplate()];
    expect(filterCatalog(templates, { categories: [] })).toEqual(templates);
  });

  it('matches cross-solution templates (no solutions field) regardless of the solution filter', () => {
    const templates = [buildTemplate({ solutions: undefined })];
    expect(filterCatalog(templates, { solution: 'security' })).toEqual(templates);
  });

  it('matches cross-solution templates with an empty solutions array', () => {
    const templates = [buildTemplate({ solutions: [] })];
    expect(filterCatalog(templates, { solution: 'security' })).toEqual(templates);
  });

  it('excludes templates whose solutions do not include the filter', () => {
    const templates = [buildTemplate({ solutions: ['observability'] })];
    expect(filterCatalog(templates, { solution: 'security' })).toEqual([]);
  });

  it('includes templates whose solutions include the filter', () => {
    const templates = [buildTemplate({ solutions: ['security', 'observability'] })];
    expect(filterCatalog(templates, { solution: 'security' })).toEqual(templates);
  });

  it('combines search, categories, and solution filters (AND semantics)', () => {
    const templates = [
      buildTemplate({
        slug: 'match',
        name: 'IP Reputation Check',
        categories: ['enrichment'],
        solutions: ['security'],
      }),
      buildTemplate({
        slug: 'wrong-category',
        name: 'IP Reputation Check',
        categories: ['notification'],
        solutions: ['security'],
      }),
      buildTemplate({
        slug: 'wrong-solution',
        name: 'IP Reputation Check',
        categories: ['enrichment'],
        solutions: ['observability'],
      }),
    ];

    const result = filterCatalog(templates, {
      search: 'reputation',
      categories: ['enrichment'],
      solution: 'security',
    });
    expect(result.map((t) => t.slug)).toEqual(['match']);
  });
});
