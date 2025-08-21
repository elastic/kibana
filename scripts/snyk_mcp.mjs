/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// eslint-disable-next-line @kbn/eslint/module_migration
import { z } from 'zod';
import fetch from 'node-fetch';
import path from 'path';

// TODO validate config with zod
// const ConfigSchema = z.object({
//   snykProjectId: z.string().min(1, 'Snyk Project ID cannot be empty'),
//   snykOrgId: z.string().min(1, 'Snyk Org ID cannot be empty'),
//   snykApiKey: z.string().min(1, 'Snyk API Key cannot be empty'),
// });

const config = {
  snykProjectId: process.env.SNYK_PROJECT_ID,
  snykApiKey: process.env.SNYK_API_KEY,
  snykOrgId: process.env.SNYK_ORG_ID,
};

const server = new McpServer(
  {
    name: 'snyk-triage-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      prompts: {},
    },
  }
);

server.tool(
  'raise_snyk_exception',
  'Raise Snyk Exception',
  {
    snykIssueNumber: z
      .string()
      .min(1, 'Snyk issue number cannot be empty')
      .describe('Snyk issue number.'),
    cveId: z.string().min(1, 'CVE ID cannot be empty').describe('CVE ID of the vulnerability.'),
    justification: z
      .string()
      .min(1, 'Justification cannot be empty')
      .describe('Justification for the exception request.'),
    remediationPlan: z
      .string()
      .min(1, 'Remediation plan cannot be empty')
      .describe('Remediation plan for the vulnerability.'),
    expirationDate: z
      .string()
      .min(1, 'Expiration date cannot be empty')
      .describe('Expiration date for the exception request.'),
  },
  async (args) => {
    const { snykIssueNumber, cveId, justification, remediationPlan, expirationDate } = args;

    const content = `
      ### Applicable artifacts

      **CVE ID**: ${cveId}

      **Applicable Artifact**:
      - [elastic/kibana(main):package.json](https://app.snyk.io/org/kibana/project/${config.snykProjectId}) : 9.2.0

      **Snyk Issue ID**: https://app.snyk.io/org/kibana/project/${config.snykProjectId}#${snykIssueNumber}

      ### Exception request reasons

      - [x] Risk Adjustment
      - [x] Operational Requirement
      - [x] False Positive
      - [ ] Vendor Dependency

      ### Detailed Justification
      ${justification}


      ### Remediation Plan
      ${remediationPlan}

      ### Exception Expiration

      ${expirationDate}`;

    // TODO add github call to create issue
    return {
      content: [
        {
          type: 'text',
          text: `Snyk exception request raised successfully. Please check issue`,
        },
      ],
    };
  }
);

server.tool(
  'make_triage_comment',
  {
    justification: z
      .string()
      .min(1, 'Justification cannot be empty')
      .describe('Justification for the exception request.'),
    riskResponse: z
      .enum(['mitigate', 'avoid', 'accept'])
      .describe("Risk response for the vulnerability. Can be 'mitigate', 'avoid' or 'accept'."),
  },
  async (args) => {
    const { riskResponse, justification } = args;

    const content = `
    - **Triage:** ${justification}
    - **Risk response:** ${riskResponse}
    - **Upgrade paths:**
      - package@x.y.z -> package@x.y.z`;

    // TODO add github call to create comment
    return {
      content: [
        {
          type: 'text',
          text: `Triage comment created successfully. ${content}`,
        },
      ],
    };
  }
);

server.tool(
  'triage_snyk_issue',
  'Triage the snyk issue',
  {
    snykIssueNumber: z
      .string()
      .min(1, 'Snyk issue number cannot be empty')
      .describe('Snyk issue number.'),
  },
  async (args) => {
    try {
      const { snykIssueNumber } = args;

      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      headers.append('Authorization', `Token ${config.snykApiKey}`);
      const vulnerabilityResponse = await fetch(`https://api.snyk.io/v1/vuln/${snykIssueNumber}`, {
        method: 'GET',
        headers,
      });

      const vulnerability = await vulnerabilityResponse.json();

      const issuesResponse = await fetch(
        `https://api.snyk.io/v1/org/${config.snykOrgId}/project/${config.snykProjectId}/aggregated-issues`,
        {
          method: 'POST',
          body: JSON.stringify({
            filters: {
              ignored: false,
            },
            includeDescription: true,
            includeIntroducedThrough: true,
          }),
          headers,
        }
      );

      const { issues } = await issuesResponse.json();

      const issue = issues.find((issue) => issue.id === snykIssueNumber);

      const pathsEndpoint = issue.links.paths;

      const pathsResponse = await fetch(pathsEndpoint, {
        method: 'GET',
        headers,
      });

      const { paths } = await pathsResponse.json();

      const introducedThrough = paths
        .map((depChain) => depChain.map(({ name, version }) => `${name}@${version}`).join(' -> '))
        .join(';');

      const { severity, identifiers } = vulnerability;
      const [cveId] = identifiers.CVE;

      const exceptionTTLBySeverity = {
        critical: 90,
        high: 180,
        medium: 270,
        low: 365,
      };

      const exceptionDays =
        exceptionTTLBySeverity[severity.toLowerCase()] ?? exceptionTTLBySeverity.low;

      const hasSamplesForInference = Boolean(process.env.SAMPLES_PATH);
      const triageCommentSamples = hasSamplesForInference
        ? `Refer to samples ${path.resolve(
            process.env.SAMPLES_PATH,
            'triage_response.md'
          )} for examples.`
        : '';

      const plan = {
        steps: [
          {
            id: 'analyze_vulnerability',
            description:
              `@workspace ${vulnerability.packageName} has vulnerabilities. Severity ${severity}, CVE ID ${cveId}` +
              vulnerability.description +
              `It was introduced through ${introducedThrough}. You don't need to run any commands for dependency tree.
            You need to triage this package, extract vulnerable functions and methods from the description (if applicable).
            Find if there are any usages in the codebase (ignore tests, ignore node_modules, ignore target folders, we are interested in production application code). List the usages and check if they are vulnerable.`,
          },
          {
            id: 'make_triage_comment',
            description: `Based on the triage from previous step, make a triage comment with the justification and risk response. ${triageCommentSamples}.`,
            tool: 'make_triage_comment',
          },
          {
            id: 'raise_snyk_exception',
            description: `If the package is dev-only dependency, raise Snyk exception request with the justification and remediation plan. The expiration date should be set to from today's date + ${exceptionDays} days, CVE ID ${cveId}, Snyk issue number ${snykIssueNumber}.`,
            tool: 'raise_snyk_exception',
          },
        ],
      };

      return {
        content: [
          {
            type: 'text',
            text: `You need to triage the Snyk issue: ${snykIssueNumber}. Follow the instruction steps below carefully. ${JSON.stringify(
              plan,
              null,
              2
            )}`,
          },
        ],
        structuredContent: plan,
      };
    } catch (error) {
      console.error('Error during Snyk issue triage:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error during Snyk issue triage: ${error.message}. Please check the Snyk issue number and try again.`,
          },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
