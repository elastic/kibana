/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Template } from '@kbn/workflows-library';
import { recommendTemplates } from './recommend_templates';

const HASH = `sha256:${'a'.repeat(64)}`;

const buildTemplate = (overrides: Partial<Template> = {}): Template => ({
  slug: 'sample-template',
  version: '1.0.0',
  availability: '>=9.5.0',
  name: 'Sample',
  description: 'A sample template.',
  categories: ['enrichment'],
  definitionUrl: 'templates/sample/1.0.0.yaml',
  contentHash: HASH,
  stepTypes: ['elasticsearch.search'],
  triggerTypes: ['manual'],
  ...overrides,
});

describe('recommendTemplates', () => {
  it('returns an empty list when the catalog is empty', () => {
    expect(recommendTemplates({ templates: [] })).toEqual([]);
  });

  it('uses solution reasons when filtering by solution (v1 honesty)', () => {
    const templates = [
      buildTemplate({ slug: 'sec-a', name: 'Sec A', solutions: ['security'] }),
      buildTemplate({ slug: 'sec-b', name: 'Sec B', solutions: ['security'] }),
      buildTemplate({ slug: 'obs-a', name: 'Obs A', solutions: ['observability'] }),
    ];

    const result = recommendTemplates({
      templates,
      signals: { solution: 'security' },
    });

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.template.slug)).toEqual(['sec-a', 'sec-b']);
    expect(result.every((r) => r.reason.signal === 'solution')).toBe(true);
    expect(result[0].reason.label).toContain('Security');
    expect(result[0].reason.tooltip).toContain('Security');
  });

  it('falls back to popular starters when no signal matches', () => {
    const templates = [
      buildTemplate({ slug: 'a' }),
      buildTemplate({ slug: 'b' }),
      buildTemplate({ slug: 'c' }),
      buildTemplate({ slug: 'd' }),
    ];

    const result = recommendTemplates({ templates });

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.template.slug)).toEqual(['a', 'b', 'c']);
    expect(result.every((r) => r.reason.signal === 'popular')).toBe(true);
  });

  it('ranks connector matches ahead of solution picks with connector reasons', () => {
    const templates = [
      buildTemplate({
        slug: 'slack-notify',
        solutions: ['security'],
        stepTypes: ['slack.postMessage'],
      }),
      buildTemplate({ slug: 'sec-only', solutions: ['security'], stepTypes: ['elasticsearch.search'] }),
    ];

    const result = recommendTemplates({
      templates,
      signals: { solution: 'security', connectorActionTypeIds: ['.slack'] },
    });

    expect(result[0].template.slug).toBe('slack-notify');
    expect(result[0].reason.signal).toBe('connector');
    expect(result[0].reason.label).toContain('Slack');
    expect(result[1].reason.signal).toBe('solution');
  });

  it('never pads beyond available templates', () => {
    const templates = [buildTemplate({ slug: 'only' })];
    expect(recommendTemplates({ templates, limit: 3 })).toHaveLength(1);
  });

  it('matches data tags against categories with data reasons', () => {
    const templates = [
      buildTemplate({ slug: 'k8s', categories: ['kubernetes'], solutions: ['observability'] }),
      buildTemplate({ slug: 'other', categories: ['enrichment'], solutions: ['observability'] }),
    ];

    const result = recommendTemplates({
      templates,
      signals: { solution: 'observability', dataTags: ['kubernetes'] },
    });

    expect(result[0].template.slug).toBe('k8s');
    expect(result[0].reason.signal).toBe('data');
    expect(result[0].reason.label).toContain('Kubernetes');
  });
});
