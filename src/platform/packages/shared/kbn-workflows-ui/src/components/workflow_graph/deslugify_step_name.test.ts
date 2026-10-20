/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { deslugifyStepName } from './deslugify_step_name';

describe('deslugifyStepName', () => {
  it('deslugifies a snake_case name', () => {
    expect(deslugifyStepName('send_slack_message')).toBe('Send Slack Message');
  });

  it('deslugifies a kebab-case name', () => {
    expect(deslugifyStepName('fetch-user-data')).toBe('Fetch User Data');
  });

  it('deslugifies a camelCase name', () => {
    expect(deslugifyStepName('fetchUserData')).toBe('Fetch User Data');
  });

  it('deslugifies mixed separators', () => {
    expect(deslugifyStepName('fetch_user-Data')).toBe('Fetch User Data');
  });

  it('restores a tech acronym written in slug form to all-caps', () => {
    expect(deslugifyStepName('http_request')).toBe('HTTP Request');
    expect(deslugifyStepName('api-call')).toBe('API Call');
  });

  it('preserves an already-uppercase acronym in a prose name', () => {
    expect(deslugifyStepName('HTTP request')).toBe('HTTP Request');
  });

  it('title-cases an already human-readable prose name', () => {
    expect(deslugifyStepName('Fetch national parks')).toBe('Fetch National Parks');
  });

  it('keeps a letter glued to a trailing digit as one word', () => {
    expect(deslugifyStepName('demo_amazon_s3')).toBe('Demo Amazon S3');
    expect(deslugifyStepName('sha256_checksum')).toBe('Sha256 Checksum');
  });

  it('keeps an explicitly separated digit as its own word', () => {
    expect(deslugifyStepName('fetch_5_items')).toBe('Fetch 5 Items');
    expect(deslugifyStepName('demo_amazon_s_3')).toBe('Demo Amazon S 3');
    // Regression: a glued token elsewhere in the string must not cause a
    // false-positive re-glue for a separated pair (and vice-versa).
    expect(deslugifyStepName('s_3_and_s3')).toBe('S 3 And S3');
    expect(deslugifyStepName('s3_and_s_3')).toBe('S3 And S 3');
  });

  it('completes in linear time on a long letters-only name (ReDoS guard)', () => {
    // The previous implementation used /([A-Za-z]+) (\d+)/g on uncontrolled
    // input, which is O(n²) on runs of letters with no trailing digit.
    // This test would hang (>10 s) with that regex and passes in milliseconds now.
    const long = 'a'.repeat(5000);
    expect(deslugifyStepName(long)).toBe(`A${long.slice(1)}`);
  });
});
