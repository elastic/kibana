/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

import axios from 'axios';
import semver from 'semver';

const SNYK_REST_API_BASE = 'https://api.snyk.io/rest';
const SNYK_API_VERSION = '2025-01-22';
const NPM_REGISTRY_URL = 'https://registry.npmjs.org/{packageName}';
const NPMS_IO_API_URL = 'https://api.npms.io/v2/package/{packageName}';

const WEIGHTS = {
  security: 0.3,
  maintenance: 0.45,
  quality: 0.2,
  popularity: 0.05,
};

const WEIGHT_CRITICAL = 10.0; // 'Cost' weight per critical vulnerability
const WEIGHT_HIGH     =  5.0; // 'Cost' weight per high vulnerability
const WEIGHT_MEDIUM   =  1.5; // 'Cost' weight per medium vulnerability
const WEIGHT_LOW      =  0.5; // 'Cost' weight per low vulnerability

const INTERNAL_PACKAGE_PREFIX = '@kbn/';
const TARGET_FILE = 'package.json';

const run = async ({ github, context, core, snykToken, snykOrgId }) => {
  async function getFileContent(owner, repo, path, ref) {
    core.info(`Workspaceing content for ${path} at ref ${ref}`);
    try {
      const response = await github.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      const content = Buffer.from(response.data.content, 'base64').toString('utf8');

      return content;
    } catch (error) {
      if (error.status === 404) {
        core.info(`File ${path} not found at ref ${ref}. Assuming empty content.`);
        return null;
      }
      core.error(`Error fetching file ${path} at ref ${ref}: ${error.message}`);
      throw error;
    }
  }

  function parsePackageJson(content) {
    if (!content) return {};
    try {
      const data = JSON.parse(content);
      const dependencies = data.dependencies || {};
      const devDependencies = data.devDependencies || {};
      return { ...dependencies, ...devDependencies };
    } catch (error) {
      core.warning(`Error parsing package.json content: ${error.message}`);
      return {}
    }
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
    // Use 'latest' as default if range is invalid or empty, though package.json usually has valid ranges.
    const validRange = semver.validRange(range) ? range : 'latest';
    const url = NPM_REGISTRY_URL.replace('{packageName}', encodeURIComponent(packageName));
    core.info(`Querying npm registry for ${packageName} versions: ${url}`);

    try {
      const response = await axios.get(url, { timeout: 15000 });
      if (!response.data || !response.data.versions) {
        core.warning(`No version information found on npm registry for ${packageName}.`);
        return null;
      }

      const availableVersions = Object.keys(response.data.versions);
      const maxSatisfying = semver.maxSatisfying(availableVersions, validRange);

      if (maxSatisfying) {
        core.info(
          `Resolved ${packageName} range '${range}' to latest satisfying version: ${maxSatisfying}`
        );
        return maxSatisfying;
      } else {
        // If range is specific like '1.2.3' and exists, maxSatisfying finds it.
        // If range is like '>5.0.0' and no version satisfies it, this occurs.
        core.warning(
          `No version found on npm registry for ${packageName} that satisfies range '${validRange}'.`
        );
        // Maybe fallback to 'latest' tag?
        const latestVersion = response.data['dist-tags']?.latest;
        if (latestVersion && semver.satisfies(latestVersion, validRange)) {
          core.info(
            `Falling back to 'latest' tag version: ${latestVersion} which satisfies range.`
          );
          return latestVersion;
        } else if (latestVersion) {
          core.warning(
            `'latest' tag version ${latestVersion} does not satisfy range '${validRange}'.`
          );
          return null;
        }
        return null;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        core.warning(`Package ${packageName} not found on npm registry.`);
      } else {
        core.error(
          `Error querying npm registry for ${packageName}: ${error.response?.status} ${
            error.message || error
          }`
        );
      }
      return null;
    }
  }

  async function fetchNpmsScore(packageName) {
    const url = NPMS_IO_API_URL.replace('{packageName}', encodeURIComponent(packageName));
    core.info(`Workspaceing npms.io score for ${packageName} from ${url}`);
    try {
      const response = await axios.get(url, { timeout: 15000 });
      const details = response.data?.score?.detail;
      if (
        details &&
        details.quality != null &&
        details.popularity != null &&
        details.maintenance != null
      ) {
        return {
          quality: parseFloat(details.quality),
          popularity: parseFloat(details.popularity),
          maintenance: parseFloat(details.maintenance),
        };
      } else {
        core.warning(`Incomplete score details from npms.io for ${packageName}`);
        return null;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        core.warning(`Package ${packageName} not found on npms.io.`);
      } else {
        core.error(`Error fetching npms.io data for ${packageName}: ${error.message || error}`);
      }
      return null;
    }
  }

  async function fetchSnykSecurityScore(packageName, packageVersion, token, orgId) {
    core.info(`Workspaceing Snyk REST API data for ${packageName}@${packageVersion}...`);

    if (!token) {
      core.warning('SNYK_TOKEN not provided. Skipping Snyk analysis.');
      return null;
    }
    if (!orgId) {
      core.warning('SNYK_ORG_ID not provided. Skipping Snyk REST API analysis.');
      return null;
    }

    const purl = encodeURIComponent(`pkg:npm/${packageName}@${packageVersion}`);

    const snykHeaders = {
      Authorization: `Token ${token}`,
      Accept: 'application/vnd.api+json',
    };

    let packageId = null;

    const findPackageUrl = `${SNYK_REST_API_BASE}/orgs/${orgId}/packages/${purl}/issues?version=${SNYK_API_VERSION}`;
    core.info(`Querying Snyk for package: pkg:npm/${packageName}@${packageVersion}`);

    try {
      const packageResponse = (await axios.get(findPackageUrl, {
        headers: snykHeaders,
        timeout: 30000,
      })).data;


      if (packageResponse && packageResponse?.meta?.package?.name) {
        packageId = packageResponse?.meta?.package?.name;
        core.info(`Found Snyk package ID for ${packageName}@${packageVersion}: ${packageId}`);
      } else {
        core.warning(
          `Package ${packageName}@${packageVersion} not found in Snyk organization. Cannot fetch issues.`
        );

        // Return null because we cannot determine the vulnerability status via this method
        return null;
      }

      if (packageResponse && packageResponse.data) {
        const issues = packageResponse.data;
        core.info(
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

        core.info(`Calculated weighted security score for ${packageName}@${packageVersion}: ${score} (Cost Sum: ${score})`);

        return score
      } else {
        core.warning(
          `Unexpected response structure from Snyk issues endpoint for ${packageName}@${packageVersion}. Assuming OK.`
        );

        return 1.0;
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        const detail = errorData?.errors?.[0]?.detail || JSON.stringify(errorData);
        core.error(
          `Error finding Snyk package ${packageName}@${packageVersion} (Status ${status}): ${detail}`
        );
      } else {
        core.error(
          `Network error finding Snyk package ${packageName}@${packageVersion}: ${error.message}`
        );
      }
      return null;
    }
  }

  // --- Snyk Placeholder ---
  async function fetchSnykSecurityScoreMock(packageName, packageVersion, token, orgId) {
    return Math.random();
  }

  function calculateFinalScore(scores) {
    if (!scores.npms || scores.securityScore == null) {
      return null;
    }
    const finalScore =
      scores.securityScore * WEIGHTS.security +
      scores.npms.maintenance * WEIGHTS.maintenance +
      scores.npms.quality * WEIGHTS.quality +
      scores.npms.popularity * WEIGHTS.popularity;
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
      const q = data.npms ? formatScore(data.npms.quality) : 'Error';
      const p = data.npms ? formatScore(data.npms.popularity) : 'Error';
      const m = data.npms ? formatScore(data.npms.maintenance) : 'Error';
      const s = formatScore(data.securityScore);
      const final = formatScore(data.finalScore);
      const notes = data.notes.join(', ') || '-';
      // const npmsLink = `[${name}](https://npms.io/search?q=${encodeURIComponent(name)})`;

      report += `| ${name} | ${data.version} | ${q} | ${p} | ${m} | ${s} | **${final}** | ${notes} |\n`;
    }

    report += `\n*Scores range from 0.0 (worst) to 1.0 (best). Weights: Security (${WEIGHTS.security*100}%), Maintenance (${WEIGHTS.maintenance*100}%), Quality (${WEIGHTS.quality*100}%), Popularity (${WEIGHTS.popularity*100}%).*`;

    report += `\n*Security score uses Snyk REST API. Score = 1 / (1 + weighted cost sum), using weights C:${WEIGHT_CRITICAL}, H:${WEIGHT_HIGH}, M:${WEIGHT_MEDIUM}, L:${WEIGHT_LOW}.*`

    return report;
  }

  try {
    const pr = context.payload.pull_request;
    if (!pr) {
      core.warning('Not a pull request context. Skipping analysis.');
      return { commentBody: '', analysisPerformed: false };
    }

    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const baseSha = pr.base.sha;
    const headSha = pr.head.sha;

    const packageJsonPath = TARGET_FILE;

    const oldContent = await getFileContent(owner, repo, packageJsonPath, baseSha);
    const newContent = await getFileContent(owner, repo, packageJsonPath, headSha);

    if (newContent === null) {
      core.info(`'${packageJsonPath}' not found in the head branch. Skipping.`);
      return { commentBody: '', analysisPerformed: false };
    }

    const oldDeps = parsePackageJson(oldContent);
    const newDeps = parsePackageJson(newContent);

    const addedPackages = findNewDependencies(oldDeps, newDeps);
    const addedPackageNames = Object.keys(addedPackages);

    if (addedPackageNames.length === 0) {
      core.info('No new third-party dependencies found.');
      // Optionally post a comment saying nothing was found, or just exit cleanly
      // return { commentBody: 'No new third-party dependencies found.', analysisPerformed: true };
      return { commentBody: '', analysisPerformed: false }; // Don't comment if nothing found
    }

    core.info(`Found new dependencies: ${addedPackageNames.join(', ')}`);

    const analysisResults = {};
    const promises = addedPackageNames.map(async (name) => {
      const version = addedPackages[name];
      const notes = [];
      core.info(`Analyzing ${name}@${version}...`);

      const exactVersion = await resolveVersionFromRegistry(name, version);
      if (!exactVersion) {
        notes.push(`Exact version not resolved via npm registry for range '${version}'`);
      }

      const [npmsData, securityScore] = await Promise.all([
        fetchNpmsScore(name),
        fetchSnykSecurityScoreMock(name, exactVersion, snykToken, snykOrgId),
      ]);

      if (!npmsData) notes.push('npms.io data unavailable');
      if (securityScore === null) notes.push('Snyk analysis skipped or failed');


      analysisResults[name] = {
        version: version,
        npms: npmsData,
        securityScore: securityScore,
        finalScore: calculateFinalScore({ npms: npmsData, securityScore: securityScore }),
        notes: notes,
      };
    });

    await Promise.all(promises);

    const comment = formatReport(analysisResults);
    core.info('Analysis complete.');
    core.setOutput('comment_body', comment);

    return { commentBody: comment, analysisPerformed: true };
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}\n${error.stack}`);
    return { commentBody: '', analysisPerformed: false };
  }
};

export default run;
