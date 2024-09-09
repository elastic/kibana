/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRegExpPatternFrom } from './create_regexp_pattern_from';

describe('createRegExpPatternFrom should create a regular expression starting from a string that', () => {
  const regExpPattern = createRegExpPatternFrom('logs');

  it('tests positive for single index patterns starting with the passed base pattern', () => {
    expect('logs*').toMatch(regExpPattern);
    expect('logs-*').toMatch(regExpPattern);
    expect('logs-*-*').toMatch(regExpPattern);
    expect('logs-system.syslog-*').toMatch(regExpPattern);

    expect('logss*').not.toMatch(regExpPattern);
    expect('logss-*').not.toMatch(regExpPattern);
    expect('metrics*').not.toMatch(regExpPattern);
    expect('metrics-*').not.toMatch(regExpPattern);
  });

  it('tests positive for single index patterns containing the passed base pattern', () => {
    expect('foo-logs*').toMatch(regExpPattern);
    expect('foo-logs-*').toMatch(regExpPattern);
    expect('foo-logs-*-*').toMatch(regExpPattern);
    expect('foo-logs-system.syslog-*').toMatch(regExpPattern);
    expect('.ds-kibana_sample_data_logs-2024.06.13-000001').toMatch(regExpPattern);

    expect('foo-logss*').not.toMatch(regExpPattern);
    expect('foo-logss-*').not.toMatch(regExpPattern);
    expect('foo-metrics*').not.toMatch(regExpPattern);
    expect('foo-metrics-*').not.toMatch(regExpPattern);
  });

  it('tests positive for single index patterns with CCS prefixes', () => {
    expect('cluster1:logs-*').toMatch(regExpPattern);
    expect('cluster1:logs-*-*').toMatch(regExpPattern);
    expect('cluster1:logs-system.syslog-*').toMatch(regExpPattern);
    expect('cluster1:logs-system.syslog-default').toMatch(regExpPattern);

    expect('cluster1:logss*').not.toMatch(regExpPattern);
    expect('cluster1:logss-*').not.toMatch(regExpPattern);
    expect('cluster1:metrics*').not.toMatch(regExpPattern);
    expect('cluster1:metrics-*').not.toMatch(regExpPattern);
  });

  it('tests positive for multiple index patterns comma-separated if all of them individually match the criteria', () => {
    expect('logs-*,cluster1:logs-*').toMatch(regExpPattern);
    expect('cluster1:logs-*,cluster2:logs-*').toMatch(regExpPattern);
    expect('*:logs-system.syslog-*,*:logs-system.errors-*').toMatch(regExpPattern);

    expect('*:metrics-system.syslog-*,logs-system.errors-*').not.toMatch(regExpPattern);
  });

  it('tests positive for patterns with trailing commas', () => {
    expect('logs-*,').toMatch(regExpPattern);
    expect('cluster1:logs-*,logs-*,').toMatch(regExpPattern);
  });

  it('tests negative for patterns with spaces and unexpected commas', () => {
    expect('cluster1:logs-*,clust,er2:logs-*').not.toMatch(regExpPattern);
    expect('cluster1:logs-*,    cluster2:logs-*').not.toMatch(regExpPattern);
  });
});
