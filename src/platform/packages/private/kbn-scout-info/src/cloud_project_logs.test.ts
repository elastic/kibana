/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getCloudProjectLogs } from './cloud_project_logs';
import type { ScoutElasticCloudTarget } from './reporting';

const PROJECT_ID = 'cf0e5979c7e74167b6abe94e7f5bd148';
const QA_PROJECT: ScoutElasticCloudTarget = {
  project: { id: PROJECT_ID },
  region: 'aws-eu-west-1',
  environment: 'qa',
};

/** Decodes a Discover link back into its time range and ES|QL query. */
const parseDiscoverUrl = (url: string) => {
  const [base, hash] = url.split('#');
  const params = new URLSearchParams(hash.replace(/^\/\?/, ''));
  const globalState = params.get('_g') ?? '';
  const appState = params.get('_a') ?? '';
  const [, from, to] = globalState.match(/^\(time:\(from:'([^']+)',to:'([^']+)'\)\)$/) ?? [];
  const [, esql] =
    appState.match(/^\(dataSource:\(type:esql\),query:\(esql:'([\s\S]*)'\)\)$/) ?? [];
  return { base, from, to, esql: esql?.replace(/!(.)/g, '$1') };
};

describe('getCloudProjectLogs', () => {
  it("links to a timeline of the QA project's logs around the test", () => {
    const logs = getCloudProjectLogs({
      target: QA_PROJECT,
      startTime: '2026-11-21T06:52:10.000Z',
      duration: 8_000,
    });

    expect(logs).toMatchObject({
      projectId: PROJECT_ID,
      region: 'aws-eu-west-1',
      from: '2026-11-21T06:47:10.000Z',
      to: '2026-11-21T06:54:18.000Z',
    });
    const { base, from, to, esql } = parseDiscoverUrl(logs?.url ?? '');
    expect(base).toBe('https://overview.qa.cld.elstc.co/app/discover');
    expect(from).toBe('2026-11-21T06:47:10.000Z');
    expect(to).toBe('2026-11-21T06:54:18.000Z');
    expect(esql).toContain(
      'FROM logging-aws-eu-west-1:logs-elastic-pod-autoscaler.log-default, logging-aws-eu-west-1:logs-elasticsearch.server-default, logging-aws-eu-west-1:logs-kibana.log-default, logging-aws-eu-west-1:logs-proxy.log-default'
    );
    expect(esql).toContain(`| WHERE serverless.project.id == "${PROJECT_ID}"`);
    // rison escapes the "!" of "!=", which must decode back
    expect(esql).toContain('COALESCE(status_reason, "") != "INITIALIZING"');
    expect(esql).toMatch(
      /\| KEEP @timestamp, source, pod, event\n\| SORT @timestamp\n\| LIMIT 1000$/
    );
  });

  it('percent-encodes the state so the link survives being put in Markdown and HTML', () => {
    const logs = getCloudProjectLogs({ target: QA_PROJECT, startTime: '2026-11-21T06:52:10Z' });

    expect(logs?.url).toMatch(/^[A-Za-z0-9%\-._~:/?#&=]+$/);
  });

  it('ends the range 2 minutes after the start time when the duration is missing', () => {
    const logs = getCloudProjectLogs({ target: QA_PROJECT, startTime: '2026-11-21T06:52:10Z' });

    expect(logs).toMatchObject({
      from: '2026-11-21T06:47:10.000Z',
      to: '2026-11-21T06:54:10.000Z',
    });
  });

  it.each<[string, ScoutElasticCloudTarget | undefined]>([
    ['no target', undefined],
    [
      'a hosted deployment',
      { deployment: { id: 'b72e04' }, region: 'gcp-us-central1', environment: 'qa' },
    ],
    ['a project outside QA', { ...QA_PROJECT, environment: 'staging' }],
    ['a project without an environment', { project: { id: PROJECT_ID }, region: 'aws-eu-west-1' }],
    ['a project without a region', { project: { id: PROJECT_ID }, environment: 'qa' }],
    ['a region that is not a plain name', { ...QA_PROJECT, region: 'aws-eu-west-1" OR true' }],
    ['a project ID that is not a plain ID', { ...QA_PROJECT, project: { id: 'cf0e"5979' } }],
  ])('returns nothing for %s', (_, target) => {
    expect(getCloudProjectLogs({ target, startTime: '2026-11-21T06:52:10Z' })).toBeUndefined();
  });

  it.each([undefined, '', 'not a date'])(
    'returns nothing when the start time is %p',
    (startTime) => {
      expect(getCloudProjectLogs({ target: QA_PROJECT, startTime })).toBeUndefined();
    }
  );
});
