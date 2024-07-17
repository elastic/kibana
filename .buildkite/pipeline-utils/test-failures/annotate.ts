/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { execSync } from 'child_process';
import { mkdirSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { BuildkiteClient } from '..';
import { Artifact } from '../buildkite/types/artifact';

const buildkite = new BuildkiteClient();

export interface TestFailure {
  name: string;
  classname: string;
  time: string;
  'metadata-json'?: string | undefined;
  failure: string;
  likelyIrrelevant: boolean;
  'system-out'?: string | undefined;
  hash: string;
  buildId: string;
  jobId: string;
  url: string;
  jobName: string;
  githubIssue?: string;
  failureCount?: number;
}

const recursiveReadDir = (dirPath: string, allFiles: string[] = []) => {
  const files = readdirSync(dirPath);

  for (const file of files) {
    if (statSync(join(dirPath, file)).isDirectory()) {
      allFiles = recursiveReadDir(join(dirPath, file), allFiles);
    } else {
      allFiles.push(join(dirPath, file));
    }
  }

  return allFiles;
};

export const getAnnotation = (
  failures: TestFailure[],
  failureHtmlArtifacts: Record<string, Artifact>
): string => {
  return (
    `**Test Failures**<br />\n` +
    failures
      .map((failure) => {
        const lookup = failure.jobId + failure.hash;
        const jobUrl = `${failure.url}#${failure.jobId}`;
        const artifactUrl =
          lookup in failureHtmlArtifacts
            ? `${failure.url.replace(
                'https://buildkite.com/elastic',
                'https://buildkite.com/organizations/elastic/pipelines'
              )}/jobs/${failure.jobId}/artifacts/${failureHtmlArtifacts[lookup].id}`
            : '';

        const logsLink = artifactUrl ? ` [[logs]](${artifactUrl})` : '';

        return `[[job]](${jobUrl})${logsLink} ${failure.jobName} / ${failure.name}`;
      })
      .join('<br />\n')
  );
};

export const getPrComment = (
  failures: TestFailure[],
  failureHtmlArtifacts: Record<string, Artifact>
): string => {
  return (
    `### Test Failures\n` +
    failures
      .map((failure) => {
        const lookup = failure.jobId + failure.hash;
        const jobUrl = `${failure.url}#${failure.jobId}`;
        const artifactUrl =
          lookup in failureHtmlArtifacts
            ? `${failure.url.replace(
                'https://buildkite.com/elastic',
                'https://buildkite.com/organizations/elastic/pipelines'
              )}/jobs/${failure.jobId}/artifacts/${failureHtmlArtifacts[lookup].id}`
            : '';

        const logsLink = artifactUrl ? ` [[logs]](${artifactUrl})` : '';

        // failure name could have #<number>, which Github will link to an issue or @<string>,
        // which will send a notification so we need to "escape" it with spans
        const failureString = `${failure.jobName} / ${failure.name}`
          .replaceAll('#', '#<span></span>')
          .replaceAll('@', '@<span></span>');
        return `* [[job]](${jobUrl})${logsLink} ${failureString}`;
      })
      .join('\n')
  );
};

export const getSlackMessage = (
  failures: TestFailure[],
  failureHtmlArtifacts: Record<string, Artifact>
): string => {
  return (
    `*Test Failures*\n` +
    failures
      .map((failure) => {
        const lookup = failure.jobId + failure.hash;
        const jobUrl = `${failure.url}#${failure.jobId}`;
        const artifactUrl =
          lookup in failureHtmlArtifacts
            ? `${failure.url.replace(
                'https://buildkite.com/elastic',
                'https://buildkite.com/organizations/elastic/pipelines'
              )}/jobs/${failure.jobId}/artifacts/${failureHtmlArtifacts[lookup].id}`
            : '';

        const logsLink = artifactUrl ? ` <${artifactUrl}|[logs]>` : '';

        const failuresCount =
          failure.failureCount && failure.githubIssue
            ? ` <${failure.githubIssue}|[${failure.failureCount} failure${
                failure.failureCount > 1 ? 's' : ''
              }]>`
            : '';

        return `<${jobUrl}|[job]>${logsLink}${failuresCount} ${failure.jobName} / ${failure.name}`;
      })
      .join('\n')
  );
};

export const annotateTestFailures = async () => {
  const exec = (cmd: string) => execSync(cmd, { stdio: 'inherit' });

  const failureDir = 'target/process-test-failures';
  mkdirSync(failureDir, { recursive: true });

  const artifacts = await buildkite.getArtifactsForCurrentBuild();
  const failureHtmlArtifacts: Record<string, Artifact> = {};
  for (const artifact of artifacts) {
    if (artifact.path.match(/test_failures\/.*?\.html$/)) {
      const [jobId, hash] = artifact.filename.split(/_|\./);
      failureHtmlArtifacts[jobId + hash] = artifact;
    }
  }

  exec(
    `.buildkite/scripts/common/download_artifact.sh --include-retried-jobs "target/test_failures/*.json" "${failureDir}"`
  );

  const failures: TestFailure[] = recursiveReadDir(failureDir)
    .map((file) => {
      try {
        if (file.endsWith('.json')) {
          return JSON.parse(readFileSync(file).toString());
        }
      } catch (ex) {
        console.error((ex as Error).message);
      }
      return null;
    })
    .filter((f) => f)
    .sort((a, b) => a.name.localeCompare(b.name));

  buildkite.setAnnotation('test_failures', 'error', getAnnotation(failures, failureHtmlArtifacts));

  if (process.env.ELASTIC_PR_COMMENTS_ENABLED === 'true') {
    buildkite.setMetadata(
      'pr_comment:test_failures:body',
      getPrComment(failures, failureHtmlArtifacts)
    );
  }

  if (process.env.ELASTIC_SLACK_NOTIFICATIONS_ENABLED === 'true') {
    buildkite.setMetadata(
      'slack:test_failures:body',
      getSlackMessage(failures, failureHtmlArtifacts)
    );
  }
};
