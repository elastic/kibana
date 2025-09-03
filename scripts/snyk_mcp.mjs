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
import { existsSync } from 'fs';

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
  githubRepo: 'snyk_vuln_analyzer_testing',
  mode: process.env.MODE ?? 'debug',
};

const isDebugMode = config.mode === 'debug';

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
    const query = `repo:elastic/${config.githubRepo} is:issue "${cveId}" in:title,body label:Kibana`;
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
    if (isDebugMode) {
      const triagePath = path.resolve(process.env.DATA_PATH, 'triage/risk_assessment.md');

      if (!existsSync(triagePath)) {
        await fs.mkdir(triagePath, { recursive: true });
      }

      await fs.appendFile(
        path.resolve(triagePath),
        `Comment for issue https://api.github.com/repos/elastic/${config.githubRepo}/issues/${issueNumber}:\n${comment}\n\n`
      );

      return;
    }

    const response = await fetch(
      `https://api.github.com/repos/elastic/${config.githubRepo}/issues/${issueNumber}/comments`,
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
    cveId: z.string().min(1, 'CVE ID cannot be empty').describe('CVE ID of the vulnerability.'),
    status: z
      .enum(['future update', 'not exploitable', 'false positive'])
      .describe('Status of the vulnerability.'),
    statement: z
      .string()
      .min(1, 'Statement cannot be empty')
      .describe('The security statement content.'),
    dependency: z
      .string()
      .min(1, 'Dependency cannot be empty')
      .describe('The name of the npm package, i.e. "minimist".'),
  },
  async (args) => {
    const { issueNumber, cveId, statement, dependency, status } = args;

    const formattedPost = `### Security statement\n\`\`\`yaml\n
      cve: ${cveId}
      status: ${status}
      statement: ${statement}
      product: kibana
      dependency: ${dependency}
    \n\`\`\``;

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
    upgradePaths: z.array(z.string()).describe('List of upgrade paths.').optional().default([]),
  },
  async (args) => {
    const { riskResponse, justification, issueNumber, upgradePaths } = args;

    const content = `
    - **Triage:** ${justification}
    - **Risk response:** ${riskResponse}
    - **Upgrade paths:**
      ${upgradePaths.length ? upgradePaths.map((path) => `  - ${path}`).join('\n') : 'N/A'}
    `;

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
  'generate_security_statement_template',
  'Generate security statement template',
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

      return {
        content: [
          {
            type: 'text',
            text: issueNumber
              ? `Found related GitHub issue: #${issueNumber} for CVE ID ${cveId}.`
              : `No related GitHub issue found for CVE ID ${cveId}.`,
          },
        ],
      };
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
  pathToFileURL(path.resolve(process.env.DATA_PATH, 'triage_response.md')).href,
  {
    description: 'Few-shot examples of how to make triage comments for Snyk issues',
    mimeType: 'text/markdown',
  },
  async (uri) => {
    try {
      const fileContent = await fs.readFile(
        path.resolve(process.env.DATA_PATH, 'triage_response.md'),
        'utf-8'
      );

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
  'confirm_risk_assessment',
  'Confirm risk assessment with user and allow modifications',
  {
    assessment: z.string().describe('The risk assessment to present to the user'),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']).describe('Assessed risk level'),
    allowModifications: z
      .boolean()
      .optional()
      .describe('Whether to allow the user to modify the assessment'),
  },
  async (args) => {
    const { assessment, riskLevel, allowModifications = true } = args;

    const text = allowModifications
      ? `Risk Assessment:\n${assessment}\n\nRisk Level: ${riskLevel}\n\nPlease confirm if you accept this assessment or provide modifications. You can change the risk level or provide additional justification.`
      : `Risk Assessment:\n${assessment}\n\nRisk Level: ${riskLevel}\n\nPlease confirm this assessment.`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
      structuredContent: {
        requiresUserInput: true,
        assessment,
        riskLevel,
        allowModifications,
      },
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

      const remediationPlan = paths.reduce((acc, depChain) => {
        const depToUpgrade = depChain.find((dep) => dep.fixVersion);

        const introducedThrough = depChain
          .map(({ name, version }) => `${name}@${version}`)
          .join(' -> ');

        if (!depToUpgrade) {
          acc.push(`Introduced through: ${introducedThrough}. No upgrade path available;`);
          return acc;
        }

        const fix =
          depToUpgrade.version === depToUpgrade?.fixVersion
            ? `Dependencies are out of date, otherwise you would be using a newer ${depToUpgrade?.fixVersion}. Try relocking lockfile.`
            : `Upgrade ${depToUpgrade.name} to version ${depToUpgrade?.fixVersion}`;

        acc.push(`Introduced through: ${introducedThrough}. Fix: ${fix};`);

        return acc;
      }, []);

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

      const hasUpgradePath = remediationPlan.some(
        (plan) => !plan.includes('No upgrade path available')
      );

      const plan = {
        steps: [
          {
            id: 'analyze_vulnerability',
            description:
              `@workspace ${vulnerability.packageName} has vulnerabilities. Severity ${severity}, CVE ID ${cveId}` +
              vulnerability.description +
              `It was introduced through ${introducedThrough}
              You need to triage the ${vulnerability.packageName} package, extract vulnerable functions and methods from the description (if applicable).
              Find if there are any usages in the codebase (ignore tests, ignore target folders, we are interested in production application code).
              List the usages and check if they are vulnerable.`,
          },
          {
            id: 'perform_upgrades',
            description: `You need to perform upgrades that do not come with breaking changes. Follow the remediation plan below carefully. ${remediationPlan}.  Keep in mind that kibana cannot upgrade to esm only modules. After changing the package.json, use 'yarn kbn bootstrap' to update the lockfile.`,
            // sometimes Copilot was skipping this step, so added required field to see if it helps
            required: hasUpgradePath,
          },
          {
            id: 'validate_upgrades',
            description:
              'Verify that the necessary upgrades were completed by checking the new dependency versions in package.json and yarn.lock',
            required: hasUpgradePath,
          },
          {
            id: 'find_github_issue',
            description: `Using the CVE ID, find the related GitHub issue in the ${config.githubRepo} repo.`,
            tool: 'find_github_issue',
          },
          {
            id: 'make_triage_comment',
            description: `Based on the triage from previous step, make a triage comment with the justification, risk response and upgrade paths we performed (if any) as array of entries ['package1@x.y.z -> package1@x.y.z', 'package2@x.y.z -> package3@x.y.z']. Confirm the risk assessment with the user and allow modifications.`,
            tool: 'make_triage_comment',
            samples: [
              {
                resource: 'sample.snyk-triage-response',
                purpose: 'guidance',
                mimeType: 'text/markdown',
              },
            ],
          },
          {
            id: 'generate_security_statement_template',
            description: `Based on the triage and justification from previous steps, create a template for a security statement.`,
            tool: 'generate_security_statement_template',
          },
          {
            id: 'write_security_statement_post',
            description: `Based on the triage, justification, and template for a security statement from previous step generate security statement. Use kibana version for statement from package.json`,
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
            text: `Triage the Snyk issue: ${snykIssueNumber}. Follow the instruction steps below carefully in the exact order. ${JSON.stringify(
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

// Commented it out for now, so Copilot can look into perform_upgrades and validate_upgrades steps
// and suggest code changes for those steps in the triage_snyk_issue tool

// server.tool(
//   'analyze_library_usage_and_upgrade_feasibility',
//   'Analyze library usage and determine upgrade feasibility',
//   {
//     packageName: z.string().describe('Name of the vulnerable package'),
//     currentVersion: z.string().describe('Current version of the package'),
//     fixedVersion: z.string().describe('Version that fixes the vulnerability'),
//     triageAnalysis: z.string().describe('The triage analysis from the vulnerability assessment'),
//     dependencyChain: z
//       .string()
//       .optional()
//       .describe('Dependency chain showing how the package is introduced'),
//   },
//   async (args) => {
//     const { packageName, currentVersion, fixedVersion, triageAnalysis, dependencyChain } = args;

//     try {
//       // Check if we have direct imports/usage of the package
//       const directUsageResults = [];

//       // Search for direct imports
//       const importPatterns = [
//         `require\\(['"]${packageName}['"]\\)`,
//         `from\\s+['"]${packageName}['"]`,
//         `import\\s+.*\\s+from\\s+['"]${packageName}['"]`,
//         `import\\(['"]${packageName}['"]\\)`,
//       ];

//       for (const pattern of importPatterns) {
//         // We'll use a simple approach - check common file patterns
//         const searchResults = await searchCodebase(pattern, packageName);
//         if (searchResults.length > 0) {
//           directUsageResults.push(...searchResults);
//         }
//       }

//       // Analyze package.json dependencies
//       const packageJsonAnalysis = await analyzePackageJsonDependencies(packageName);

//       // Check for API usage patterns specific to the package
//       const apiUsageAnalysis = await analyzeAPIUsage(packageName, triageAnalysis);

//       // Determine upgrade feasibility
//       const upgradeFeasibility = await assessUpgradeFeasibility(
//         packageName,
//         currentVersion,
//         fixedVersion,
//         dependencyChain
//       );

//       const analysis = {
//         packageName,
//         currentVersion,
//         fixedVersion,
//         directUsage: {
//           found: directUsageResults.length > 0,
//           locations: directUsageResults,
//           count: directUsageResults.length,
//         },
//         packageJsonPresence: packageJsonAnalysis,
//         apiUsageAnalysis,
//         upgradeFeasibility,
//         recommendations: generateRecommendations(
//           directUsageResults.length > 0,
//           packageJsonAnalysis,
//           upgradeFeasibility
//         ),
//       };

//       return {
//         content: [
//           {
//             type: 'text',
//             text: formatAnalysisReport(analysis),
//           },
//         ],
//         structuredContent: analysis,
//       };
//     } catch (error) {
//       console.error('Error analyzing library usage:', error);
//       return {
//         content: [
//           {
//             type: 'text',
//             text: `Error analyzing library usage for ${packageName}: ${error.message}`,
//           },
//         ],
//       };
//     }
//   }
// );

// Helper functions for the analysis tool
async function searchCodebase(pattern, packageName) {
  const results = [];
  try {
    // This is a simplified search - in practice, you might want to use more sophisticated tools
    // For now, we'll return a placeholder that indicates we should use grep or similar
    results.push({
      pattern,
      packageName,
      note: 'Use grep search tool to find actual usage patterns',
    });
  } catch (error) {
    console.error(`Error searching for pattern ${pattern}:`, error);
  }
  return results;
}

async function analyzePackageJsonDependencies(packageName) {
  try {
    // Check if package is in dependencies, devDependencies, or peerDependencies
    return {
      inDependencies: false, // Would check package.json
      inDevDependencies: false, // Would check package.json
      inPeerDependencies: false, // Would check package.json
      isTransitive: true, // Most likely case based on our triage patterns
      note: 'Check package.json files to determine dependency type',
    };
  } catch (error) {
    console.error('Error analyzing package.json dependencies:', error);
    return { error: error.message };
  }
}

async function analyzeAPIUsage(packageName, triageAnalysis) {
  // Extract potential API usage patterns from the triage analysis
  const commonPatterns = {
    'cipher-base': ['update', 'digest', 'createHash'],
    lodash: ['map', 'filter', 'reduce', 'merge'],
    moment: ['format', 'parse', 'diff'],
    axios: ['get', 'post', 'put', 'delete'],
  };

  const packagePatterns = commonPatterns[packageName] || [];

  return {
    commonAPIs: packagePatterns,
    analysisFound: triageAnalysis.includes(packageName),
    potentialUsage:
      packagePatterns.length > 0
        ? `May use common ${packageName} APIs: ${packagePatterns.join(', ')}`
        : 'No common API patterns identified',
    recommendation:
      packagePatterns.length > 0
        ? 'Search codebase for these common API patterns'
        : 'Manual inspection recommended',
  };
}

async function assessUpgradeFeasibility(
  packageName,
  currentVersion,
  fixedVersion,
  dependencyChain
) {
  // Parse version numbers to assess breaking changes
  const currentMajor = parseInt(currentVersion.split('.')[0]);
  const fixedMajor = parseInt(fixedVersion.split('.')[0]);

  const majorVersionChange = fixedMajor > currentMajor;
  const isTransitive = dependencyChain && dependencyChain.includes(' -> ');

  return {
    majorVersionChange,
    isTransitive,
    riskLevel: majorVersionChange ? 'high' : 'low',
    feasibility: isTransitive
      ? 'depends-on-parent'
      : majorVersionChange
      ? 'requires-testing'
      : 'low-risk',
    recommendations: [
      isTransitive ? 'Upgrade depends on parent dependency update cycle' : 'Can upgrade directly',
      majorVersionChange
        ? 'Major version change - review changelog for breaking changes'
        : 'Minor/patch version - likely safe to upgrade',
      'Test thoroughly before deploying to production',
    ],
  };
}

function generateRecommendations(hasDirectUsage, packageAnalysis, upgradeFeasibility) {
  const recommendations = [];

  if (hasDirectUsage) {
    recommendations.push('Direct usage found - review all usage locations before upgrading');
  } else {
    recommendations.push('No direct usage found - likely safe to upgrade');
  }

  if (upgradeFeasibility.isTransitive) {
    recommendations.push('Transitive dependency - coordinate with parent dependency updates');
  }

  if (upgradeFeasibility.majorVersionChange) {
    recommendations.push('Major version change detected - review changelog and test extensively');
  } else {
    recommendations.push('Minor version change - lower risk upgrade');
  }

  return recommendations;
}

function formatAnalysisReport(analysis) {
  return `
## Library Usage & Upgrade Feasibility Analysis

**Package:** ${analysis.packageName}
**Current Version:** ${analysis.currentVersion}
**Fixed Version:** ${analysis.fixedVersion}

### Direct Usage Analysis
- **Direct usage found:** ${analysis.directUsage.found ? 'Yes' : 'No'}
- **Usage locations:** ${analysis.directUsage.count}
${analysis.directUsage.locations.map((loc) => `  - ${loc.pattern}`).join('\n')}

### Dependency Analysis
- **Dependency type:** ${analysis.packageJsonPresence.isTransitive ? 'Transitive' : 'Direct'}
- **In package.json:** ${
    analysis.packageJsonPresence.inDependencies
      ? 'dependencies'
      : analysis.packageJsonPresence.inDevDependencies
      ? 'devDependencies'
      : 'not found'
  }

### API Usage Patterns
- **Common APIs:** ${analysis.apiUsageAnalysis.commonAPIs.join(', ') || 'None identified'}
- **Potential usage:** ${analysis.apiUsageAnalysis.potentialUsage}

### Upgrade Feasibility
- **Risk Level:** ${analysis.upgradeFeasibility.riskLevel}
- **Feasibility:** ${analysis.upgradeFeasibility.feasibility}
- **Major version change:** ${analysis.upgradeFeasibility.majorVersionChange ? 'Yes' : 'No'}
- **Is transitive:** ${analysis.upgradeFeasibility.isTransitive ? 'Yes' : 'No'}

### Recommendations
${analysis.recommendations.map((rec) => `- ${rec}`).join('\n')}

### Next Steps
${analysis.upgradeFeasibility.recommendations.map((rec) => `- ${rec}`).join('\n')}
  `.trim();
}

const transport = new StdioServerTransport();
await server.connect(transport);
