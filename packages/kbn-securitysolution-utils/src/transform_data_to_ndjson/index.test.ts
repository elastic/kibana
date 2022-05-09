/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transformDataToNdjson } from '.';

export const ANCHOR_DATE = '2020-02-20T03:57:54.037Z';

const getRulesSchemaMock = (anchorDate: string = ANCHOR_DATE) => ({
  author: [],
  id: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
  created_at: new Date(anchorDate).toISOString(),
  updated_at: new Date(anchorDate).toISOString(),
  created_by: 'elastic',
  description: 'some description',
  enabled: true,
  false_positives: ['false positive 1', 'false positive 2'],
  from: 'now-6m',
  immutable: false,
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  references: ['test 1', 'test 2'],
  severity: 'high',
  severity_mapping: [],
  updated_by: 'elastic_kibana',
  tags: ['some fake tag 1', 'some fake tag 2'],
  to: 'now',
  type: 'query',
  threat: [],
  version: 1,
  output_index: '.siem-signals-default',
  max_signals: 100,
  risk_score: 55,
  risk_score_mapping: [],
  language: 'kuery',
  rule_id: 'query-rule-id',
  interval: '5m',
  exceptions_list: [],
});

describe('transformDataToNdjson', () => {
  test('if rules are empty it returns an empty string', () => {
    const ruleNdjson = transformDataToNdjson([]);
    expect(ruleNdjson).toEqual('');
  });

  test('single rule will transform with new line ending character for ndjson', () => {
    const rule = getRulesSchemaMock();
    const ruleNdjson = transformDataToNdjson([rule]);
    expect(ruleNdjson.endsWith('\n')).toBe(true);
  });

  test('multiple rules will transform with two new line ending characters for ndjson', () => {
    const result1 = getRulesSchemaMock();
    const result2 = getRulesSchemaMock();
    result2.id = 'some other id';
    result2.rule_id = 'some other id';
    result2.name = 'Some other rule';

    const ruleNdjson = transformDataToNdjson([result1, result2]);
    // this is how we count characters in JavaScript :-)
    const count = ruleNdjson.split('\n').length - 1;
    expect(count).toBe(2);
  });

  test('you can parse two rules back out without errors', () => {
    const result1 = getRulesSchemaMock();
    const result2 = getRulesSchemaMock();
    result2.id = 'some other id';
    result2.rule_id = 'some other id';
    result2.name = 'Some other rule';

    const ruleNdjson = transformDataToNdjson([result1, result2]);
    const ruleStrings = ruleNdjson.split('\n');
    const reParsed1 = JSON.parse(ruleStrings[0]);
    const reParsed2 = JSON.parse(ruleStrings[1]);
    expect(reParsed1).toEqual(result1);
    expect(reParsed2).toEqual(result2);
  });
});
