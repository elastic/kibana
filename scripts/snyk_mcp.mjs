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
import { pathToFileURL } from 'url';
import fs from 'fs/promises';

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
  githubToken: process.env.GITHUB_TOKEN,
};

const server = new McpServer(
  {
    name: 'snyk-triage-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      prompts: {},
      tools: {
        listChanged: true,
      },
    },
  }
);

async function findGitHubIssue(cveId) {
  try {
    const query = `repo:elastic/snyk_vuln_analyzer_testing is:issue "${cveId}" in:title,body label:Kibana`;
    const response = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'snyk-triage-mcp',
          Authorization: `token ${config.githubToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      return data.items[0].number;
    }

    return null;
  } catch (error) {
    console.error('Error finding GitHub issue:', error);
    return null;
  }
}

async function writeCommentOnGitHubIssue(issueNumber, comment) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/elastic/snyk_vuln_analyzer_testing/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'snyk-triage-mcp',
          Authorization: `token ${config.githubToken}`,
        },
        body: JSON.stringify({ body: comment }),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error writing comment to GitHub issue:', error);
    throw error;
  }
}

server.tool(
  'write_security_statement_post',
  'Write the security statement post to the GitHub issue',
  {
    issueNumber: z.number().describe('GitHub issue number to post the security statement.'),
    securityPost: z
      .string()
      .min(1, 'Security post cannot be empty')
      .describe('Security post content in YAML format.'),
  },
  async (args) => {
    const { issueNumber, securityPost } = args;

    const formattedPost = `### Security statement\n\`\`\`yaml\n${securityPost}\n\`\`\``;

    await writeCommentOnGitHubIssue(issueNumber, formattedPost);

    return {
      content: [
        {
          type: 'text',
          text: `Security statement post added to GitHub issue #${issueNumber} in repository .`,
        },
      ],
    };
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
    issueNumber: z.number().describe('GitHub issue number to post the security statement.'),
  },
  async (args) => {
    const { snykIssueNumber, cveId, justification, remediationPlan, expirationDate, issueNumber } =
      args;

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

    await writeCommentOnGitHubIssue(issueNumber, content);

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
    issueNumber: z.number().describe('GitHub issue number to post the security statement.'),
  },
  async (args) => {
    const { riskResponse, justification, issueNumber } = args;

    const content = `
    - **Triage:** ${justification}
    - **Risk response:** ${riskResponse}
    - **Upgrade paths:**
      - package@x.y.z -> package@x.y.z`;

    await writeCommentOnGitHubIssue(issueNumber, content);

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
  'issue_security_statement_template',
  'Issue security statement template',
  {
    isKibanaVulnerable: z.boolean().describe('Is Kibana vulnerable to the issue?'),
    justification: z
      .string()
      .min(1, 'Justification cannot be empty')
      .describe('Justification for the exception request.'),
  },
  async (args) => {
    const { justification, isKibanaVulnerable } = args;

    const securityStatementOutline = `
        Information:
        - **Is Kibana vulnerable?**: ${isKibanaVulnerable ? 'Yes' : 'No'}
        - **Justification**: ${justification}

        Generalized Templates:
        - If Kibana is not vulnerable:
          Kibana uses \`package@x.y.z\` as part of some functionality (alternatively/additionally: as a transitive dependency of \`package@x.y.z\`).
          Kibana is not affected by this issue because ${justification}. Nevertheless, \`package@x.y.z\` will be updated to version \`patched Y version\` as part of Kibana standard maintenance practices in Kibana version x.y.z.
        - If Kibana is vulnerable:
          Kibana is affected by this issue. \`package@x.y.z\` will be updated to version \`patched Y version\` as part of Kibana standard maintenance practices in Kibana version x.y.z.
      `;

    return {
      content: [
        {
          type: 'text',
          text: `Security statement template: \n\n ${securityStatementOutline}`,
        },
      ],
    };
  }
);

server.tool(
  'find_github_issue',
  'Find GitHub issue related to the Snyk vulnerability',
  {
    cveId: z
      .string()
      .min(1, 'CVE ID cannot be empty')
      .describe('CVE ID of the vulnerability to find related GitHub issue.'),
  },
  async (args) => {
    const { cveId } = args;

    try {
      const issueNumber = await findGitHubIssue(cveId);

      if (issueNumber) {
        return {
          content: [
            {
              type: 'text',
              text: `Found related GitHub issue: #${issueNumber} for CVE ID ${cveId}.`,
            },
          ],
          structuredContent: {
            issueNumber,
          },
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `No related GitHub issue found for CVE ID ${cveId}.`,
            },
          ],
        };
      }
    } catch (error) {
      console.error('Error finding GitHub issue:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error finding GitHub issue for CVE ID ${cveId}: ${error.message}`,
          },
        ],
      };
    }
  }
);

server.registerResource(
  'sample.snyk-triage-response',
  pathToFileURL(path.resolve('./samples/triage_response.md')).href,
  {
    description: 'Few-shot examples of how to make triage comments for Snyk issues',
    mimeType: 'text/markdown',
  },
  async (uri) => {
    try {
      const fileContent = await fs.readFile(path.resolve('./samples/triage_response.md'), 'utf-8');

      return {
        contents: [
          {
            uri: uri.href,
            text: fileContent,
          },
        ],
      };
    } catch (error) {
      console.error(`Failed to read resource ${uri.href}:`, error);
      return { contents: [] };
    }
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

      const plan = {
        steps: [
          {
            id: 'analyze_vulnerability',
            description:
              `@workspace ${vulnerability.packageName} has vulnerabilities. Severity ${severity}, CVE ID ${cveId}` +
              vulnerability.description +
              `It was introduces through ${introducedThrough}
              You need to triage this package, extract vulnerable functions and methods from the description (if applicable).
              This analysis should also check yarn.lock.
              Find if there are any usages in the codebase (ignore tests, ignore target folders, we are interested in production application code).
              List the usages and check if they are vulnerable.
              If the package is a transitive dependency, check node_modules to see if the parent dependencies are using the vulnerable functions.`,
          },
          {
            id: 'find_github_issue',
            description:
              'Using the CVE ID, find the related GitHub issue in the snyk_vuln_analyzer_testing repo.',
            tool: 'find_github_issue',
          },
          {
            id: 'make_triage_comment',
            description: `Based on the triage from previous step, make a triage comment with the justification and risk response.`,
            tool: 'make_triage_comment',
            structuredContent: {
              samples: [
                {
                  resource: 'sample.snyk-triage-response',
                  purpose: 'guidance',
                  mimeType: 'text/markdown',
                },
              ],
            },
          },
          {
            id: 'determine_kibana_latest_versions',
            description: `determine the next version of Kibana that will be released after the current version.`,
          },
          {
            id: 'issue_security_statement_template',
            description: `Based on the triage and justification from previous steps, create a template for a security statement.`,
            tool: 'issue_security_statement_template',
          },
          {
            id: 'issue_security_statement',
            description: `Based on the triage, justification, and template for a security statement from previous steps, create text in the following format:

            \`\`\`yaml
            cve: The CVE ID for the vulnerability triaged. i.e. "CVE-2021-1223". If you are triaging more than one CVEs in the same GH issue, you need to create multiple comments
            status: Can be one of "future update", "not exploitable", "false positive".
            statement: Using the security statement template from previous step, fill in the details and make any changes to better alight with the triage that has been done, include a sentence about the Kibana version that will be released with the fix.
            product: kibana
            dependency: The name of the npm package, i.e. "minimist"
            \`\`\`

            This will be called a security post. Log it out
            `,
          },
          {
            id: 'write_security_statement_post',
            description: `Using the GitHub issue number and repo from previous steps, add the security statement post to the GitHub issue as a comment.`,
            tool: 'write_security_statement_post',
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
