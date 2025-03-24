/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { alertsFiltersToEsQuery } from './alerts_filters_to_es_query';
import { ALERT_RULE_TAGS, ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';

describe('alertsFiltersToEsQuery', () => {
  it('should return null if the operation has no filters', () => {
    expect(alertsFiltersToEsQuery({ operator: 'and', operands: [] })).toBeNull();
  });

  it('should return null if the operation has only empty filters', () => {
    expect(
      alertsFiltersToEsQuery({ operator: 'and', operands: [{}, { type: 'ruleTypes' }] })
    ).toBeNull();
  });

  it('should convert `and` operations to `must` bool queries', () => {
    expect(
      alertsFiltersToEsQuery({
        operator: 'and',
        operands: [
          { type: 'ruleTypes', value: ['type-1'] },
          { type: 'ruleTypes', value: ['type-2'] },
        ],
      })
    ).toEqual({
      bool: {
        must: [
          { terms: { [ALERT_RULE_TYPE_ID]: ['type-1'] } },
          { terms: { [ALERT_RULE_TYPE_ID]: ['type-2'] } },
        ],
      },
    });
  });

  it('should convert `or` operations to `should` bool queries', () => {
    expect(
      alertsFiltersToEsQuery({
        operator: 'or',
        operands: [
          { type: 'ruleTypes', value: ['type-1'] },
          { type: 'ruleTypes', value: ['type-2'] },
        ],
      })
    ).toEqual({
      bool: {
        should: [
          { terms: { [ALERT_RULE_TYPE_ID]: ['type-1'] } },
          { terms: { [ALERT_RULE_TYPE_ID]: ['type-2'] } },
        ],
      },
    });
  });

  it('should convert nested operations to nested bool queries', () => {
    expect(
      alertsFiltersToEsQuery({
        operator: 'or',
        operands: [
          {
            operator: 'and',
            operands: [
              { type: 'ruleTypes', value: ['type-1'] },
              { type: 'ruleTypes', value: ['type-2'] },
            ],
          },
          { type: 'ruleTags', value: ['tag-1'] },
        ],
      })
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                { terms: { [ALERT_RULE_TYPE_ID]: ['type-1'] } },
                { terms: { [ALERT_RULE_TYPE_ID]: ['type-2'] } },
              ],
            },
          },
          { terms: { [ALERT_RULE_TAGS]: ['tag-1'] } },
        ],
      },
    });
  });
});
