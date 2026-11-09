/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildPhraseFilter, buildPhrasesFilter, toggleFilterNegated } from '@kbn/es-query';
import {
  extractEntitiesFromFilters,
  extractEntitiesFromKql,
  extractSeedEntities,
} from './extract_entities';

const indexPattern = { id: 'logs-*', title: 'logs-*' };

const phrase = (name: string, value: string) =>
  buildPhraseFilter({ name, type: 'string' }, value, indexPattern);

describe('extractEntitiesFromFilters', () => {
  it('reads positive phrase and phrases filters and skips negated or disabled filters', () => {
    const negated = toggleFilterNegated(phrase('service.name', 'ignored'));
    const disabled = {
      ...phrase('host.name', 'disabled-host'),
      meta: { ...phrase('host.name', 'disabled-host').meta, disabled: true },
    };
    const phrases = buildPhrasesFilter(
      { name: 'host.name', type: 'string' },
      ['web-1', 'web-2'],
      indexPattern
    );

    expect(
      extractEntitiesFromFilters([
        negated,
        disabled,
        phrase('service.name', 'checkout'),
        phrases,
        phrase('user.name', 'ada'),
        phrase('source.ip', '203.0.113.10'),
        phrase('process.name', 'ignored-process'),
      ])
    ).toEqual({
      'service.name': 'checkout',
      'host.name': 'web-1',
      'user.name': 'ada',
      'source.ip': '203.0.113.10',
    });
  });
});

describe('extractEntitiesFromKql', () => {
  it('reads positive top-level equality terms and ignores negated or OR terms', () => {
    expect(
      extractEntitiesFromKql({
        language: 'kuery',
        query:
          'service.name : "checkout" and service.environment : production and not host.name : "bad" and (container.id : "c1" or container.id : "c2")',
      })
    ).toEqual({
      'service.name': 'checkout',
      'service.environment': 'production',
    });
  });

  it('ignores malformed KQL and ES|QL queries', () => {
    expect(extractEntitiesFromKql({ language: 'kuery', query: 'service.name : (' })).toEqual({});
    expect(
      extractEntitiesFromKql({ esql: 'FROM logs-* | WHERE service.name == "checkout"' })
    ).toEqual({});
  });
});

describe('extractSeedEntities', () => {
  it('prefers clicked breakdown filters over ambient filters and KQL terms', () => {
    expect(
      extractSeedEntities({
        clickedFilters: [phrase('service.name', 'clicked-service')],
        filters: [phrase('service.name', 'filter-service'), phrase('host.name', 'filter-host')],
        query: {
          language: 'kuery',
          query:
            'service.name : "kql-service" and host.name : "kql-host" and container.id : "container-1"',
        },
      })
    ).toEqual({
      'service.name': 'clicked-service',
      'host.name': 'filter-host',
      'container.id': 'container-1',
    });
  });
});
