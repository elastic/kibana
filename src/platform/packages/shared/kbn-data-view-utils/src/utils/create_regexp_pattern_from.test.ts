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
  const regExpPattern = createRegExpPatternFrom('logs', 'data');

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

  it('tests correctly for patterns with the data selector suffix', () => {
    expect('logs-*::data').toMatch(createRegExpPatternFrom('logs', 'data'));
    expect('logs-*::data,').toMatch(createRegExpPatternFrom('logs', 'data'));
    expect('cluster1:logs-*::data,logs-*::data').toMatch(createRegExpPatternFrom('logs', 'data'));

    expect('logs-*').not.toMatch(createRegExpPatternFrom('logs', 'failures'));
    expect('logs-*::data').not.toMatch(createRegExpPatternFrom('logs', 'failures'));
    expect('cluster1:logs-*::data,logs-*::data').not.toMatch(
      createRegExpPatternFrom('logs', 'failures')
    );

    expect('logs-*').not.toMatch(createRegExpPatternFrom('logs', '*'));
    expect('logs-*::data').not.toMatch(createRegExpPatternFrom('logs', '*'));
    expect('cluster1:logs-*::data,logs-*::data').not.toMatch(createRegExpPatternFrom('logs', '*'));
  });

  it('tests correctly for patterns with the failures selector suffix', () => {
    expect('logs-*::failures').toMatch(createRegExpPatternFrom('logs', 'failures'));
    expect('logs-*::failures,').toMatch(createRegExpPatternFrom('logs', 'failures'));
    expect('cluster1:logs-*::failures,logs-*::failures').toMatch(
      createRegExpPatternFrom('logs', 'failures')
    );

    expect('logs-*::failures').not.toMatch(createRegExpPatternFrom('logs', 'data'));
    expect('cluster1:logs-*::failures,logs-*::failures').not.toMatch(
      createRegExpPatternFrom('logs', 'data')
    );

    expect('logs-*::failures').not.toMatch(createRegExpPatternFrom('logs', '*'));
    expect('cluster1:logs-*::failures,logs-*::failures').not.toMatch(
      createRegExpPatternFrom('logs', '*')
    );
  });

  it('tests correctly for patterns with the wildcard selector suffix', () => {
    expect('logs-*::*').toMatch(createRegExpPatternFrom('logs', '*'));
    expect('logs-*::*,').toMatch(createRegExpPatternFrom('logs', '*'));
    expect('cluster1:logs-*::*,logs-*::*').toMatch(createRegExpPatternFrom('logs', '*'));

    expect('logs-*::*').not.toMatch(createRegExpPatternFrom('logs', 'data'));
    expect('cluster1:logs-*::*,logs-*::*').not.toMatch(createRegExpPatternFrom('logs', 'data'));

    expect('logs-*::*').not.toMatch(createRegExpPatternFrom('logs', 'failures'));
    expect('cluster1:logs-*::*,logs-*::*').not.toMatch(createRegExpPatternFrom('logs', 'failures'));
  });

  it('tests negative for patterns with spaces and unexpected commas', () => {
    expect('cluster1:logs-*,clust,er2:logs-*').not.toMatch(regExpPattern);
    expect('cluster1:logs-*,    cluster2:logs-*').not.toMatch(regExpPattern);
  });
});

describe('createRegExpPatternFrom with allowPrefix: false', () => {
  const regExpPattern = createRegExpPatternFrom('traces', 'data', { allowPrefix: false });

  it('matches index names that start with the base pattern', () => {
    expect('traces').toMatch(regExpPattern);
    expect('traces-*').toMatch(regExpPattern);
    expect('traces-apm*').toMatch(regExpPattern);
    expect('traces-*.otel-*').toMatch(regExpPattern);
  });

  it('does not match when the base pattern is not at the start', () => {
    expect('shipping-traces').not.toMatch(regExpPattern);
    expect('stack-traces').not.toMatch(regExpPattern);
    expect('apm.traces').not.toMatch(regExpPattern);
    expect('mytraces').not.toMatch(regExpPattern);
  });

  it('matches data stream backing indices of names that start with the base pattern', () => {
    expect('.ds-traces-apm-default-2026.10.14-000001').toMatch(regExpPattern);
    expect('cluster1:.ds-traces-apm-default-2026.10.14-000001').toMatch(regExpPattern);
    expect('.ds-shipping-traces-default-2026.10.14-000001').not.toMatch(regExpPattern);
  });

  it('still resolves remote clusters, the data selector, and comma-separated lists', () => {
    expect('cluster1:traces-*').toMatch(regExpPattern);
    expect('traces-*::data').toMatch(regExpPattern);
    expect('traces-*,cluster1:traces-apm*').toMatch(regExpPattern);
    expect('traces-*,shipping-traces').not.toMatch(regExpPattern);
  });
});
