/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

// require('dotenv').config();

const core = require('@actions/core');

const { Octokit } = require('@octokit/rest');
const axios = require('axios');
const semver = require('semver');

const SNYK_REST_API_BASE = 'https://api.snyk.io/rest';
const SNYK_API_VERSION = '2025-01-22';
const NPM_REGISTRY_URL = 'https://registry.npmjs.org';
const NPMS_IO_API_URL = 'https://api.npms.io/v2/package';

const WEIGHT_SECURITY     =  0.3; // 'Cost' weight for security score
const WEIGHT_QUALITY      =  0.2; // 'Cost' weight for quality score
const WEIGHT_MAINTENANCE  = 0.45; // 'Cost' weight for maintenance score
const WEIGHT_POPULARITY   = 0.05; // 'Cost' weight for popularity score

const WEIGHT_CRITICAL = 10.0; // 'Cost' weight per critical vulnerability
const WEIGHT_HIGH     =  5.0; // 'Cost' weight per high vulnerability
const WEIGHT_MEDIUM   =  1.5; // 'Cost' weight per medium vulnerability
const WEIGHT_LOW      =  0.5; // 'Cost' weight per low vulnerability

const INTERNAL_PACKAGE_PREFIX = '@kbn/';
const TARGET_FILE = 'package.json';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function getFileContent(owner, repo, path, ref) {
  console.info(`Workspaceing content for ${path} at ref ${ref}`);
  const response = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });

  const content = Buffer.from(response.data.content, 'base64').toString('utf8');

  return content;
}

function parsePackageJson(content) {
  if (!content) return {};
  const data = JSON.parse(content);
  const dependencies = data.dependencies || {};
  const devDependencies = data.devDependencies || {};

  return { ...dependencies, ...devDependencies };
}

function findNewDependencies(oldDeps, newDeps) {
  const newPackages = {};

  for (const name in newDeps) {
    if (!oldDeps[name] && !name.startsWith(INTERNAL_PACKAGE_PREFIX)) {
      newPackages[name] = newDeps[name];
    }
  }
  return newPackages;
}

async function resolveVersionFromRegistry(packageName, range) {
  if (!semver.validRange(range)) {
    throw new Error(`Invalid version range '${range}' for package '${packageName}'.`);
  }

  const url = `${NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}`
  console.info(`Querying npm registry for ${packageName} versions: ${url}`);

  const response = await axios.get(url, { timeout: 15000 });

  if (!response.data || !response.data.versions) {
    console.warn(`No version information found on npm registry for ${packageName}.`);
    return null;
  }

  const availableVersions = Object.keys(response.data.versions);
  const maxSatisfying = semver.maxSatisfying(availableVersions, range);

  if (!maxSatisfying) {
    throw new Error(`No version found on npm registry for ${packageName} that satisfies range '${range}'.`);
  }

  console.info(
    `Resolved ${packageName} range '${range}' to latest satisfying version: ${maxSatisfying}`
  );

  return maxSatisfying;
}

async function fetchNpmsScore(packageName) {
  const url = `${NPMS_IO_API_URL}/${encodeURIComponent(packageName)}`
  console.info(`Workspaceing npms.io score for ${packageName} from ${url}`);
  const response = await axios.get(url, { timeout: 15000 });
  const details = response.data?.score?.detail;


  return {
    quality: parseFloat(details.quality),
    popularity: parseFloat(details.popularity),
    maintenance: parseFloat(details.maintenance),
  };
}

const run = async () => {
  const snykToken = process.env.SNYK_TOKEN;
  const snykOrgId = process.env.SNYK_ORG_ID;
  const event = process.env.EVENT_NAME;

  async function fetchSnykSecurityScore(packageName, packageVersion, token, orgId) {
    console.info(`Workspaceing Snyk REST API data for ${packageName}@${packageVersion}...`);
    const purl = encodeURIComponent(`pkg:npm/${packageName}@${packageVersion}`);

    const snykHeaders = {
      Authorization: `Token ${token}`,
      Accept: 'application/vnd.api+json',
    };

    const findPackageUrl = `${SNYK_REST_API_BASE}/orgs/${orgId}/packages/${purl}/issues?version=${SNYK_API_VERSION}`;
    console.info(`Querying Snyk for package: pkg:npm/${packageName}@${packageVersion}`);

    const packageResponse = (await axios.get(findPackageUrl, {
      headers: snykHeaders,
      timeout: 30000,
    })).data;

    if (packageResponse && packageResponse.data) {
      const issues = packageResponse.data;
      console.info(
        `Snyk found ${issues.length} vulnerability issues for ${packageName}@${packageVersion}.`
      );

      const counts = { critical: 0, high: 0, medium: 0, low: 0 };
      let score = 1.0;

      for (const issue of issues) {
        const severity = issue.attributes?.severity?.toLowerCase();

        if (severity && counts.hasOwnProperty(severity)) {
          counts[severity]++;
        }
      }

      const costSum = (counts.critical * WEIGHT_CRITICAL)
                    + (counts.high     * WEIGHT_HIGH)
                    + (counts.medium   * WEIGHT_MEDIUM)
                    + (counts.low      * WEIGHT_LOW);

      score = 1.0 / (1.0 + costSum);

      score = parseFloat(score.toFixed(3));

      console.info(`Calculated weighted security score for ${packageName}@${packageVersion}: ${score} (Cost Sum: ${score})`);

      return score;
    } else {
      console.warn(
        `Unexpected response structure from Snyk issues endpoint for ${packageName}@${packageVersion}. Assuming OK.`
      );

      return 1.0;
    }
  }

  // --- Snyk Placeholder ---
  async function fetchSnykSecurityScoreMock(packageName, packageVersion, token, orgId) {
    // return Math.random();

    return 0;
  }

  function calculateFinalScore(scores) {
    if (!scores.npms || scores.securityScore == null) {
      return null;
    }

    const finalScore =
      scores.securityScore * WEIGHT_SECURITY +
      scores.npms.maintenance * WEIGHT_MAINTENANCE +
      scores.npms.quality * WEIGHT_QUALITY +
      scores.npms.popularity * WEIGHT_POPULARITY;

    return parseFloat(finalScore.toFixed(3));
  }

  function formatScore(score) {
    return score !== null ? score.toFixed(3) : 'N/A';
  }

  function formatReport(analysisResults) {
    if (Object.keys(analysisResults).length === 0) {
      return 'No new third-party dependencies found in `package.json`.';
    }

    let report = `**Dependency Review Bot Analysis** :mag:\n\n`;
    report += `Found ${Object.keys(analysisResults).length} new third-party dependencies:\n\n`;
    report += `| Dependency | Version | Quality | Popularity | Maintenance | Security | **Final Score** | Notes |\n`;
    report += `|------------|---------|---------|------------|-------------|----------|-----------------|-------|\n`;

    for (const [name, data] of Object.entries(analysisResults)) {
      const q = formatScore(data.npms.quality);
      const p = formatScore(data.npms.popularity);
      const m = formatScore(data.npms.maintenance);
      const s = formatScore(data.securityScore);
      const final = formatScore(data.finalScore);
      const notes = data.notes.join(', ') || '-';
      // const npmsLink = `[${name}](https://npms.io/search?q=${encodeURIComponent(name)})`;

      report += `| ${name} | ${data.version} | ${q} | ${p} | ${m} | ${s} | **${final}** | ${notes} |\n`;
    }

    report += `\n*Scores range from 0.0 (worst) to 1.0 (best). Weights: Security (${WEIGHT_SECURITY*100}%), Maintenance (${WEIGHT_MAINTENANCE*100}%), Quality (${WEIGHT_QUALITY*100}%), Popularity (${WEIGHT_POPULARITY*100}%).*`;

    report += `\n*Security score uses Snyk REST API. Score = 1 / (1 + weighted cost sum), using weights C:${WEIGHT_CRITICAL}, H:${WEIGHT_HIGH}, M:${WEIGHT_MEDIUM}, L:${WEIGHT_LOW}.*`

    report += `\n\n---\n\n`;
    report += `### Self Checklist\n\n`;
    report += `To help with the review, please update the PR description to address the following points for *each new third-party dependency* listed above:\n\n`;
    report += `- [ ] **Purpose:** What is this dependency used for? Briefly explain its role in your changes.\n`;
    report += `- [ ] **Justification:** Why adding this dependency is the best approach?\n`;
    report += `- [ ] **Alternatives Explored:** Were other options considered (e.g., using existing internal libraries/utilities, implementing the functionality directly)? If so, why was this dependency chosen over them?\n`;

    report += `- [ ] **Existing Dependencies:** Does Kibana have a dependency providing similar functionality? If so, why is the new one preferred?\n\n`;
    report += `*Thank you for providing this information!*`;

    return report;
  }

  try {
    const owner = process.env.REPO_OWNER;
    const repo = process.env.REPO_NAME;
    const packageJsonPath = TARGET_FILE;

    let baseSha;
    let headSha;

    if (event === 'pull_request') {
      baseSha = process.env.BASE_SHA;
      headSha = process.env.HEAD_SHA;
    } else if (event === 'push') {
      const { data: mainBranch } = await octokit.repos.getBranch({
        owner,
        repo,
        branch: 'main',
      });
      baseSha = mainBranch.commit.sha;
      headSha = process.env.AFTER_SHA;
    }

    if (!baseSha || !headSha) {
      console.warn('Not a pull request or push context. Skipping analysis.');
      return { commentBody: '', analysisPerformed: false };
    }

    const oldContent = await getFileContent(owner, repo, packageJsonPath, baseSha);
    const newContent = await getFileContent(owner, repo, packageJsonPath, headSha);

    if (newContent === null) {
      console.info(`'${packageJsonPath}' not found in the head branch. Skipping.`);
      return { commentBody: '', analysisPerformed: false };
    }

    const oldDeps = parsePackageJson(oldContent);
    const newDeps = parsePackageJson(newContent);

    const addedPackages = findNewDependencies(oldDeps, newDeps);
    const addedPackageNames = Object.keys(addedPackages);

    if (addedPackageNames.length === 0) {
      console.info('No new third-party dependencies found.');

      return { commentBody: '', analysisPerformed: false, breachesDependencySLO: false };
    }

    console.info(`Found new dependencies: ${addedPackageNames.join(', ')}`);

    const analysisResults = {};
    const promises = addedPackageNames.map(async (name) => {
      const version = addedPackages[name];
      const notes = [];
      console.info(`Analyzing ${name}@${version}...`);

      const exactVersion = await resolveVersionFromRegistry(name, version);
      if (!exactVersion) {
        notes.push(`Exact version not resolved via npm registry for range '${version}'`);
      }

      const [npmsData, securityScore] = await Promise.all([
        fetchNpmsScore(name),
        fetchSnykSecurityScoreMock(name, exactVersion, snykToken, snykOrgId),
      ]);

      analysisResults[name] = {
        version: version,
        npms: npmsData,
        securityScore: securityScore,
        finalScore: calculateFinalScore({ npms: npmsData, securityScore: securityScore }),
        notes: notes,
      };
    });

    await Promise.all(promises);

    const report = formatReport(analysisResults);
    console.info('Analysis complete.');

    const breachesDependencySLO = Object.values(analysisResults).some((data) => {
      return data.finalScore <= 0.65;
    });

    await octokit.rest.repos.createCommitComment({
      owner,
      repo,
      commit_sha: headSha,
      body: report,
  });

    core.setOutput('analysis_performed', true);
    core.setOutput('breaches_dependency_slo', breachesDependencySLO);

    return { analysis_performed: true, breaches_dependency_slo: breachesDependencySLO };
  } catch (error) {

    core.setOutput('analysis_performed', false);
    core.setOutput('breaches_dependency_slo', false);

    console.error(`Action failed with error: ${error.message}\n${error.stack}`);
    return { analysis_performed: false, breaches_dependency_slo: false };
  }
};

run();
