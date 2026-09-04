/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { FALLBACK_SLACK_CHANNEL, getChannelForStepLabel } from './failed_suite_channels';

const PIPELINE_YML = join(
  __dirname,
  '../../../pipelines/security_solution_on_merge.yml'
);
const RESOURCE_YML = join(
  __dirname,
  '../../../pipeline-resource-definitions/kibana-security-solution-on-merge.yml'
);

const EXPECTED_CHANNELS: Record<string, string> = {
  'Serverless Entity Analytics - Security Cypress Tests': '#security-entity-analytics-alerts',
  'Serverless Explore - Security Solution Cypress Tests': '#security-threat-hunting',
  'Serverless Investigations - Security Solution Cypress Tests': '#security-threat-hunting',
  'Serverless Rule Management - Security Solution Cypress Tests':
    '#security-detection-engineering-team',
  'Serverless Rule Management - Prebuilt Rules Customization - Security Solution Cypress Tests':
    '#security-detection-engineering-team',
  'Serverless Rule Management - Prebuilt Rules Installation - Security Solution Cypress Tests':
    '#security-detection-engineering-team',
  'Serverless Rule Management - Prebuilt Rules Management - Security Solution Cypress Tests':
    '#security-detection-engineering-team',
  'Serverless Rule Management - Prebuilt Rules Upgrade - Security Solution Cypress Tests':
    '#security-detection-engineering-team',
  'Rule Management - Security Solution Cypress Tests': '#security-detection-engineering-team',
  'Rule Management - Prebuilt Rules Customization - Security Solution Cypress Tests':
    '#security-detection-engineering-team',
  'Rule Management - Prebuilt Rules Installation - Security Solution Cypress Tests':
    '#security-detection-engineering-team',
  'Rule Management - Prebuilt Rules Management - Security Solution Cypress Tests':
    '#security-detection-engineering-team',
  'Rule Management - Prebuilt Rules Upgrade - Security Solution Cypress Tests':
    '#security-detection-engineering-team',
  'Serverless Detection Engine - Security Solution Cypress Tests':
    '#security-detection-engineering-team',
  'Serverless Detection Engine - Exceptions - Security Solution Cypress Tests':
    '#security-detection-engineering-team',
  'Detection Engine - Security Solution Cypress Tests': '#security-detection-engineering-team',
  'Detection Engine - Exceptions - Security Solution Cypress Tests':
    '#security-detection-engineering-team',
  'Serverless AI Assistant - Security Solution Cypress Tests': '#security-threat-hunting',
  'AI Assistant - Security Solution Cypress Tests': '#security-threat-hunting',
  'Entity Analytics - Security Solution Cypress Tests': '#security-entity-analytics-alerts',
  'Explore - Security Solution Cypress Tests': '#security-threat-hunting',
  'Investigations - Security Solution Cypress Tests': '#security-threat-hunting',
  'Osquery Cypress Tests': '#security-defend-workflows',
  'Osquery Cypress Tests on Serverless': '#security-defend-workflows',
  'Defend Workflows Cypress Tests': '#security-defend-workflows',
  'Defend Workflows Cypress Tests on Serverless': '#security-defend-workflows',
};

describe('getChannelForStepLabel', () => {
  it.each(Object.entries(EXPECTED_CHANNELS))('maps %s to %s', (label, channel) => {
    expect(getChannelForStepLabel(label)).toBe(channel);
  });

  it('does not use the archived Rule Management channel', () => {
    expect(getChannelForStepLabel('Rule Management - Security Solution Cypress Tests')).not.toBe(
      '#security-detection-rule-management'
    );
  });

  it('falls back to SDH for unrecognized steps', () => {
    expect(getChannelForStepLabel('Some new Security Cypress Tests')).toBe(FALLBACK_SLACK_CHANNEL);
  });

  it('maps every Cypress step label in the pipeline YAML', () => {
    const yaml = readFileSync(PIPELINE_YML, 'utf8');
    const labels = [...yaml.matchAll(/^\s+label: '([^']+)'/gm)].map((match) => match[1]);
    const cypressLabels = labels.filter((label) => !label.includes('Notify owning teams'));

    expect(cypressLabels.length).toBeGreaterThan(0);
    for (const label of cypressLabels) {
      expect(EXPECTED_CHANNELS[label]).toBe(getChannelForStepLabel(label));
      expect(getChannelForStepLabel(label)).not.toBe(FALLBACK_SLACK_CHANNEL);
    }
  });

  it('keeps the build-bot Slack notifier disabled', () => {
    const yaml = readFileSync(RESOURCE_YML, 'utf8');
    expect(yaml).toMatch(/KIBANA_SLACK_NOTIFICATIONS_ENABLED:\s*'false'/);
  });
});
