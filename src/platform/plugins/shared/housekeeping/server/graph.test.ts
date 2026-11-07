/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { buildGraphFindings } from './graph';
import { indicesProvider, pipelinesProvider } from './test_helpers';
import type {
  HousekeepingResourceEntry,
  HousekeepingResourceProvider,
  HousekeepingUnusedNotChecked,
} from './types';

const indices = indicesProvider({
  resourceTypes: [
    {
      id: 'index',
      label: 'Index',
      locator: { id: 'INDEX_LOCATOR', getParams: (id) => ({ indexName: id }) },
    },
  ],
});
const pipelines = pipelinesProvider();
const providers = [indices, pipelines];
const resourceTypes = providers.flatMap(({ resourceTypes: types }) => types);

const build = (
  results: Array<{
    provider: HousekeepingResourceProvider;
    resources?: HousekeepingResourceEntry[];
    unusedNotChecked?: HousekeepingUnusedNotChecked[];
  }>,
  registered = providers,
  logger = loggingSystemMock.createLogger()
) => buildGraphFindings({ results, providers: registered, resourceTypes, logger });

describe('buildGraphFindings', () => {
  it('reports references to resources that do not exist, once per source and target', () => {
    const { groups } = build([
      {
        provider: indices,
        resources: [
          {
            type: 'index',
            id: 'logs',
            references: [
              { targetType: 'pipeline', targetId: 'gone', via: 'index.default_pipeline' },
              { targetType: 'pipeline', targetId: 'gone', via: 'index.final_pipeline' },
              { targetType: 'pipeline', targetId: 'ok', via: 'index.default_pipeline' },
            ],
          },
        ],
      },
      { provider: pipelines, resources: [{ type: 'pipeline', id: 'ok' }] },
    ]);

    expect(groups).toEqual([
      expect.objectContaining({
        id: 'broken_reference:pipeline',
        kind: 'broken_reference',
        title: 'Missing pipeline',
        findings: [
          {
            id: 'broken_reference|index:logs|pipeline:gone',
            resource: {
              type: 'index',
              id: 'logs',
              locator: { id: 'INDEX_LOCATOR', params: { indexName: 'logs' } },
            },
            related: [{ type: 'pipeline', id: 'gone' }],
            message: undefined,
            details: [
              'index.default_pipeline, index.final_pipeline point to gone, which does not exist.',
            ],
            evidence: {
              via: ['index.default_pipeline', 'index.final_pipeline'],
              usedBy: [],
              usedByCount: 0,
              existing_pipeline: ['ok'],
              existingCount: 1,
            },
          },
        ],
      }),
    ]);
  });

  it('tells who uses a resource with a broken reference', () => {
    const { groups } = build([
      {
        provider: indices,
        resources: [
          {
            type: 'index',
            id: 'logs',
            references: [
              { targetType: 'pipeline', targetId: 'parent', via: 'index.default_pipeline' },
            ],
          },
        ],
      },
      {
        provider: pipelines,
        resources: [
          {
            type: 'pipeline',
            id: 'parent',
            references: [{ targetType: 'pipeline', targetId: 'child', via: 'pipeline processor' }],
          },
        ],
      },
    ]);

    expect(groups[0].findings[0].evidence).toEqual(
      expect.objectContaining({
        usedBy: [{ type: 'index', id: 'logs', via: 'index.default_pipeline' }],
        usedByCount: 1,
        existing_pipeline: ['parent'],
      })
    );
  });

  it('does not judge references to a type that nobody listed', () => {
    const { groups } = build([
      {
        provider: indices,
        resources: [
          {
            type: 'index',
            id: 'logs',
            references: [
              { targetType: 'ilm_policy', targetId: 'gone', via: 'index.lifecycle.name' },
            ],
          },
        ],
      },
    ]);

    expect(groups).toEqual([]);
  });

  it('reports resources nobody references or uses', () => {
    const { groups } = build([
      {
        provider: indices,
        resources: [
          {
            type: 'index',
            id: 'logs',
            references: [
              { targetType: 'pipeline', targetId: 'used', via: 'index.default_pipeline' },
              { targetType: 'pipeline', targetId: 'custom-hook', via: 'processor', optional: true },
              { targetType: 'pipeline', targetId: 'no-hook', via: 'processor', optional: true },
            ],
          },
        ],
      },
      {
        provider: pipelines,
        resources: [
          { type: 'pipeline', id: 'used' },
          { type: 'pipeline', id: 'called-by-agents', inUse: true },
          { type: 'pipeline', id: 'custom-hook' },
          { type: 'pipeline', id: 'forgotten', evidence: { processed: 0 } },
        ],
      },
    ]);

    expect(groups).toEqual([
      {
        id: 'unused:pipeline',
        kind: 'unused',
        title: 'Unused pipeline',
        description: 'Nothing uses it',
        findings: [
          {
            id: 'unused|pipeline:forgotten',
            resource: { type: 'pipeline', id: 'forgotten' },
            related: [],
            fix: { description: 'Deletes it', request: 'DELETE _pipeline/forgotten' },
            evidence: { processed: 0 },
          },
        ],
      },
    ]);
  });

  it('reports unused resources with their details, unless the provider could not tell', () => {
    const resources = [{ type: 'pipeline', id: 'forgotten', details: ['Idle for 40 days'] }];
    const checked = build([
      { provider: indices, resources: [] },
      { provider: pipelines, resources },
    ]);
    const notChecked = build([
      { provider: indices, resources: [] },
      {
        provider: pipelines,
        resources,
        unusedNotChecked: [{ type: 'pipeline', reason: 'Nodes started 2 days ago' }],
      },
    ]);

    expect(checked.groups[0].findings[0].details).toEqual(['Idle for 40 days']);
    expect(notChecked.groups).toEqual([]);
    expect(notChecked.skipped).toEqual([
      expect.objectContaining({
        checkId: 'unused:pipeline',
        reason: 'incomplete',
        message: 'Nodes started 2 days ago',
      }),
    ]);
  });

  it('skips unused resources when a provider that could reference them failed', () => {
    const { groups, skipped } = build([
      { provider: indices },
      { provider: pipelines, resources: [{ type: 'pipeline', id: 'forgotten' }] },
    ]);

    expect(groups).toEqual([]);
    expect(skipped).toEqual([
      expect.objectContaining({ checkId: 'unused:pipeline', reason: 'incomplete' }),
    ]);
  });

  it('silently skips unused resources when a referencing provider was not part of the run', () => {
    const { groups, skipped } = build([
      { provider: pipelines, resources: [{ type: 'pipeline', id: 'forgotten' }] },
    ]);

    expect(groups).toEqual([]);
    expect(skipped).toEqual([]);
  });
  it('joins the different impacts of every setting that points at the same missing resource', () => {
    const { groups } = build([
      {
        provider: indices,
        resources: [
          {
            type: 'index',
            id: 'logs',
            references: [
              {
                targetType: 'pipeline',
                targetId: 'gone',
                via: 'index.default_pipeline',
                impact: 'Indexing fails.',
              },
              {
                targetType: 'pipeline',
                targetId: 'gone',
                via: 'index.final_pipeline',
                impact: 'Indexing fails.',
              },
              {
                targetType: 'pipeline',
                targetId: 'gone',
                via: 'index.other_pipeline',
                impact: 'Updates fail.',
              },
            ],
          },
        ],
      },
      { provider: pipelines, resources: [] },
    ]);

    expect(groups[0].findings[0].message).toBe('Indexing fails. Updates fail.');
  });

  it('keeps the evidence of the provider from replacing what the graph found', () => {
    const { groups } = build([
      {
        provider: indices,
        resources: [
          {
            type: 'index',
            id: 'logs',
            references: [
              { targetType: 'pipeline', targetId: 'gone', via: 'index.default_pipeline' },
            ],
            evidence: { via: 'provider', usedBy: 'provider', docs: 3 },
          },
        ],
      },
      { provider: pipelines, resources: [] },
    ]);

    expect(groups[0].findings[0].evidence).toEqual(
      expect.objectContaining({ via: ['index.default_pipeline'], usedBy: [], docs: 3 })
    );
  });

  it('leaves managed and hidden resources out of the ones a broken reference could point to', () => {
    const { groups } = build([
      {
        provider: indices,
        resources: [
          {
            type: 'index',
            id: 'logs',
            references: [
              { targetType: 'pipeline', targetId: 'gone', via: 'index.default_pipeline' },
            ],
          },
        ],
      },
      {
        provider: pipelines,
        resources: [
          { type: 'pipeline', id: 'custom' },
          { type: 'pipeline', id: 'logs-default', isManaged: true },
          { type: 'pipeline', id: '.hidden' },
        ],
      },
    ]);

    expect(groups[0].findings[0].evidence).toEqual(
      expect.objectContaining({ existing_pipeline: ['custom'], existingCount: 1 })
    );
  });

  it('reports a resource that only points at itself as unused', () => {
    const { groups } = build([
      { provider: indices, resources: [] },
      {
        provider: pipelines,
        resources: [
          {
            type: 'pipeline',
            id: 'loop',
            references: [{ targetType: 'pipeline', targetId: 'loop', via: 'pipeline processor' }],
          },
        ],
      },
    ]);

    expect(groups).toEqual([
      expect.objectContaining({
        id: 'unused:pipeline',
        findings: [expect.objectContaining({ id: 'unused|pipeline:loop' })],
      }),
    ]);
  });

  it('ignores and logs resources of a type that their provider does not own', () => {
    const logger = loggingSystemMock.createLogger();
    const { groups } = build(
      [
        {
          provider: indices,
          resources: [
            { type: 'index', id: 'logs' },
            { type: 'pipeline', id: 'not-theirs' },
          ],
        },
        { provider: pipelines, resources: [] },
      ],
      providers,
      logger
    );

    expect(groups).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      "Housekeeping provider [indices] listed [pipeline:not-theirs], a type it doesn't own"
    );
  });

  it('logs references to a type missing from the referenced types of the provider', () => {
    const logger = loggingSystemMock.createLogger();
    build(
      [
        {
          provider: indices,
          resources: [
            {
              type: 'index',
              id: 'logs',
              references: [
                { targetType: 'ilm_policy', targetId: 'a', via: 'index.lifecycle.name' },
                { targetType: 'ilm_policy', targetId: 'b', via: 'index.lifecycle.name' },
                { targetType: 'pipeline', targetId: 'ok', via: 'index.default_pipeline' },
              ],
            },
          ],
        },
      ],
      providers,
      logger
    );

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Housekeeping provider [indices] references [ilm_policy], a type missing from its referencedTypes'
    );
  });

  it('names only the providers that failed, not the ones outside the run', () => {
    const templates = indicesProvider({
      id: 'templates',
      title: 'Templates',
      resourceTypes: [{ id: 'template', label: 'Template' }],
    });
    const { skipped } = build(
      [
        { provider: indices },
        { provider: pipelines, resources: [{ type: 'pipeline', id: 'forgotten' }] },
      ],
      [...providers, templates]
    );

    expect(skipped).toEqual([
      expect.objectContaining({
        checkId: 'unused:pipeline',
        message: 'Not checked because Indices could not list their resources.',
      }),
    ]);
  });
});
