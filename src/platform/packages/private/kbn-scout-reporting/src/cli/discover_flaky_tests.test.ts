/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { judgedTogetherOf } from './discover_flaky_tests';

const log = new ToolingLog();
const pipelines = ['kibana-on-merge', 'kibana-security-solution-on-merge', 'kibana-fips'];

describe('judgedTogetherOf', () => {
  it('judges every pipeline together without the flag', () => {
    expect(judgedTogetherOf(undefined, pipelines, log)).toBeUndefined();
  });

  it('keeps the listed pipelines the report reads, leaving out the others', () => {
    expect(
      judgedTogetherOf(
        ['kibana-on-merge', 'kibana-security-solution-on-merge', 'kibana-batch-testing'],
        pipelines,
        log
      )
    ).toEqual(['kibana-on-merge', 'kibana-security-solution-on-merge']);
  });

  it('judges every pipeline on its own when the report reads none of the listed ones', () => {
    // e.g. a schedule overriding the pipelines alone with FIPS and Cloud, inheriting the list:
    // judged together, one environment could hide the flakiness of another
    expect(
      judgedTogetherOf(
        ['kibana-on-merge'],
        ['kibana-fips', 'appex-qa-serverless-kibana-scout-tests'],
        log
      )
    ).toEqual([]);
  });

  it('judges every pipeline on its own when the flag lists none', () => {
    expect(judgedTogetherOf([], pipelines, log)).toEqual([]);
  });
});
