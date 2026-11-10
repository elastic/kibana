/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HousekeepingFindingGroup } from '../common';
import { buildAskAgentPrompt } from './ask_agent_prompt';

const group: HousekeepingFindingGroup = {
  id: 'broken_reference:ingest_pipeline',
  kind: 'broken_reference',
  title: 'Missing ingest pipeline',
  description: 'The resources below point to something that does not exist.',
  findings: [],
};

const finding = {
  id: 'finding',
  resource: { type: 'index_template', id: 'logs-app' },
  related: [{ type: 'ingest_pipeline', id: 'app-v1' }],
  details: ['index.default_pipeline points to app-v1, which does not exist.'],
  message: 'Elasticsearch rejects the documents sent here.',
  evidence: {
    usedBy: [{ type: 'data_stream', id: 'logs-app-default', via: 'data_stream.template' }],
    existingCount: 2,
  },
};

describe('buildAskAgentPrompt', () => {
  it('describes the finding and what Housekeeping already verified', () => {
    const prompt = buildAskAgentPrompt({
      group,
      finding,
      resourceTypeLabel: 'Index template',
      hasDefinition: true,
    });

    expect(prompt).toContain(
      'Before running anything that changes the cluster, show me the request and wait for my confirmation'
    );
    expect(prompt.split('\n').slice(2)).toEqual([
      '- Finding: Missing ingest pipeline',
      '- Why it matters: The resources below point to something that does not exist.',
      '- Resource: Index template logs-app',
      '- Points to: app-v1',
      '- index.default_pipeline points to app-v1, which does not exist.',
      '- Elasticsearch rejects the documents sent here.',
      '',
      'Housekeeping already verified these facts against the cluster, so you do not need to check them again:',
      '- app-v1 does not exist, and logs-app references it.',
      '- logs-app is used by: logs-app-default (data_stream.template).',
      '- The current definition of logs-app is attached, with what Housekeeping found about it, including the existing resources it could point to instead.',
    ]);
  });

  it('includes the suggested fix as a starting point', () => {
    const prompt = buildAskAgentPrompt({
      group: { ...group, kind: 'risk', id: 'risk' },
      finding: {
        ...finding,
        related: [],
        fix: { description: 'Removes the block', request: 'PUT logs/_settings\n{}' },
      },
      resourceTypeLabel: 'Index',
    });

    expect(prompt).toContain(
      '\n\nHousekeeping suggests this request, which you can start from:\n```\nPUT logs/_settings\n{}\n```'
    );
  });

  it('leaves out the verified facts when there are none', () => {
    const prompt = buildAskAgentPrompt({
      group: { ...group, kind: 'risk', id: 'risk' },
      finding: { ...finding, related: [] },
      resourceTypeLabel: 'Index',
    });

    expect(prompt).not.toContain('already verified');
    expect(prompt.endsWith('- Elasticsearch rejects the documents sent here.')).toBe(true);
  });

  it('states that nothing references an unused resource', () => {
    const prompt = buildAskAgentPrompt({
      group: { ...group, kind: 'unused', id: 'unused:ingest_pipeline' },
      finding: { ...finding, related: [], details: [], message: undefined },
      resourceTypeLabel: 'Ingest pipeline',
    });

    expect(prompt).toContain('- Nothing else in the cluster references logs-app.');
    expect(prompt).not.toContain('is attached');
  });

  it('mentions alternatives in the attachment only when Housekeeping found some', () => {
    const prompt = buildAskAgentPrompt({
      group: { ...group, kind: 'deprecation', id: 'upgrade_assistant.reindex' },
      finding: { ...finding, related: [], evidence: { level: 'critical' } },
      resourceTypeLabel: 'Index',
      hasDefinition: true,
    });

    expect(prompt).toContain(
      '- The current definition of logs-app is attached, with what Housekeeping found about it.'
    );
    expect(prompt).not.toContain('point to instead');
  });
});
