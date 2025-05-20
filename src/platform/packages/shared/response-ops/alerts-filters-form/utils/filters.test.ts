/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { alertsFiltersToEsQuery, isEmptyExpression, isFilter } from './filters';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

describe('isFilter', () => {
  it('should return true for items with filter property', () => {
    expect(isFilter({ filter: {} })).toBeTruthy();
  });

  it.each([null, undefined])('should return false for %s items', (filter) => {
    // @ts-expect-error: Testing empty values
    expect(isFilter(filter)).toBeFalsy();
  });
});

const kqlToEs = (kql: string) => toElasticsearchQuery(fromKueryExpression(kql));

describe('isEmptyExpression', () => {
  it('should return true for empty expressions', () => {
    expect(isEmptyExpression([])).toBeTruthy();
  });

  it('should return true for filters without type', () => {
    expect(isEmptyExpression([{ filter: {} }])).toBeTruthy();
  });

  it('should return true for filters without value', () => {
    expect(isEmptyExpression([{ filter: { type: 'ruleTags' } }])).toBeTruthy();
  });
});

describe('alertsFiltersToEsQuery', () => {
  it('should handle empty expressions', () => {
    expect(alertsFiltersToEsQuery([])).toMatchInlineSnapshot(`
      Object {
        "match_all": Object {},
      }
    `);
  });

  it('should handle and expressions', () => {
    const expectedKql = `kibana.alert.rule.tags: tag1 and kibana.alert.rule.rule_type_id: type1`;
    expect(
      alertsFiltersToEsQuery([
        { filter: { type: 'ruleTags', value: ['tag1'] } },
        { operator: 'and' },
        { filter: { type: 'ruleTypes', value: ['type1'] } },
      ])
    ).toEqual(kqlToEs(expectedKql));
  });

  it('should handle or expressions', () => {
    const expectedKql = `kibana.alert.rule.tags: tag1 or kibana.alert.rule.rule_type_id: type1`;
    expect(
      alertsFiltersToEsQuery([
        { filter: { type: 'ruleTags', value: ['tag1'] } },
        { operator: 'or' },
        { filter: { type: 'ruleTypes', value: ['type1'] } },
      ])
    ).toEqual(kqlToEs(expectedKql));
  });

  it('should handle complex expressions', () => {
    const expectedKql = `
    kibana.alert.rule.tags: (tag1 or tag2) or kibana.alert.rule.rule_type_id: type1 and kibana.alert.rule.tags: tag3 or kibana.alert.rule.rule_type_id: (type2 or type3)
    `;
    expect(
      alertsFiltersToEsQuery([
        { filter: { type: 'ruleTags', value: ['tag1', 'tag2'] } },
        { operator: 'or' },
        { filter: { type: 'ruleTypes', value: ['type1'] } },
        { operator: 'and' },
        { filter: { type: 'ruleTags', value: ['tag3'] } },
        { operator: 'or' },
        { filter: { type: 'ruleTypes', value: ['type2', 'type3'] } },
      ])
    ).toEqual(kqlToEs(expectedKql));
  });
});
