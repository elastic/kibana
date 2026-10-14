/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import stripAnsi from 'strip-ansi';
import type { TestFailure } from './get_failures';

// Extended TestFailure type for Scout failures
export interface ScoutTestFailureExtended extends TestFailure {
  id: string;
  target: string;
  location: string;
  duration: number;
  owners: string;
  errorMessage?: string;
  file?: string;
  kibanaModule?: {
    id: string;
    type: string;
    visibility: string;
    group: string;
  };
  attachments?: Array<{
    name: string;
    path?: string;
    contentType: string;
  }>;
  infraReason?: ScoutInfraFailureReason;
}

/** Why a Scout failure is attributed to infrastructure rather than to the test or Kibana. */
export interface ScoutInfraFailureReason {
  category: 'auth' | 'role' | 'connection' | 'cdn' | 'network';
  message: string;
}

// Scout Failure Tracking Entry interface
interface ScoutFailureTrackingEntry {
  id: string;
  suite: string;
  title: string;
  target: string;
  command: string;
  location: string;
  owner: string[];
  kibanaModule?: {
    id: string;
    type: string;
    visibility: string;
    group: string;
  };
  duration: number;
  error: {
    message?: string;
    stack_trace?: string;
  };
  stdout?: string;
  consoleErrors?: string;
  attachments: Array<{
    name: string;
    path?: string;
    contentType: string;
  }>;
  timestamp: string;
  buildkite?: {
    buildId?: string;
    jobId?: string;
    pipeline?: string;
    branch?: string;
  };
}

interface InfraFailureRule extends ScoutInfraFailureReason {
  /** `error` matches the test error/stack trace, `consoleErrors` the captured browser console errors. */
  source: 'error' | 'consoleErrors';
  /** Set when the same signal on a local run may be a Kibana bug caused by the change under test. */
  cloudOnly: boolean;
  substrings: readonly string[];
}

// Failures matching a rule are infrastructure issues rather than real test failures: no GitHub
// issue is filed, and the rule's message is shown in the HTML report instead. First match wins.
const INFRA_FAILURE_RULES: readonly InfraFailureRule[] = [
  {
    category: 'auth',
    source: 'error',
    cloudOnly: true,
    substrings: [
      'Failed to parse SAML response value',
      'SAML callback failed',
      'Failed to create the new cloud session',
    ],
    message:
      'Authentication on Elastic Cloud failed. Likely an issue with the identity provider or the test accounts, not with the test.',
  },
  {
    category: 'role',
    source: 'error',
    cloudOnly: true,
    substrings: ['role is not defined'],
    message:
      'The role used by the test has no user configured for the Elastic Cloud project. Contact the Kibana DX team to add the missing role.',
  },
  {
    category: 'connection',
    source: 'error',
    cloudOnly: false,
    substrings: ['ECONNREFUSED'],
    message:
      'The test runner could not connect to the target host. Check that the deployment was reachable during the run.',
  },
  {
    category: 'cdn',
    source: 'consoleErrors',
    cloudOnly: true,
    substrings: ['ChunkLoadError'],
    message:
      'Kibana bundles failed to load from the CDN, so the app never finished loading. If this keeps happening, contact Kibana Core (@elastic/kibana-core) about a possible CDN issue.',
  },
  {
    category: 'network',
    source: 'consoleErrors',
    cloudOnly: true,
    substrings: [
      'net::ERR_CONNECTION_CLOSED',
      'net::ERR_CONNECTION_RESET',
      'net::ERR_CONNECTION_REFUSED',
      'net::ERR_EMPTY_RESPONSE',
      'net::ERR_NAME_NOT_RESOLVED',
    ],
    message:
      'The Cloud deployment dropped or refused browser connections. Likely a bad deployment or a proxy/load balancer issue; check the project health before investigating the test.',
  },
];

const getInfraReason = (
  { target, consoleErrors = '' }: ScoutFailureTrackingEntry,
  failure: string
): ScoutInfraFailureReason | undefined => {
  const isCloudTarget = target.startsWith('cloud-');

  const rule = INFRA_FAILURE_RULES.find(({ source, cloudOnly, substrings }) => {
    if (cloudOnly && !isCloudTarget) {
      return false;
    }
    const text = source === 'error' ? failure : consoleErrors;
    return substrings.some((substring) => text.includes(substring));
  });

  return rule ? { category: rule.category, message: rule.message } : undefined;
};

export async function getScoutFailures(reportPath: string): Promise<ScoutTestFailureExtended[]> {
  if (!fs.existsSync(reportPath)) {
    return [];
  }

  const fileContent = fs.readFileSync(reportPath, 'utf-8');
  const failures: ScoutTestFailureExtended[] = [];

  // Parse NDJSON (newline-delimited JSON)
  const lines = fileContent
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      try {
        return JSON.parse(line) as ScoutFailureTrackingEntry;
      } catch (error) {
        // Failed to parse Scout failure tracking line
        return null;
      }
    })
    .filter((entry): entry is ScoutFailureTrackingEntry => entry !== null);

  for (const entry of lines) {
    // Convert Scout failure tracking entry to compatible TestFailure format
    const failure = stripAnsi(entry.error.stack_trace || entry.error.message || '');
    const infraReason = getInfraReason(entry, failure);
    const likelyIrrelevant = infraReason !== undefined;

    const testFailure: ScoutTestFailureExtended = {
      // Map Scout fields to JUnit-compatible fields
      classname: entry.suite,
      name: entry.title,
      failure,
      likelyIrrelevant,
      errorMessage: entry.error.message ? stripAnsi(entry.error.message) : undefined,
      'system-out': entry.stdout ? stripAnsi(entry.stdout) : undefined,
      owners: entry.owner.join(', '), // Convert array to string
      commandLine: entry.command,

      // Scout-specific metadata
      id: entry.id,
      target: entry.target,
      location: entry.location,
      kibanaModule: entry.kibanaModule,
      duration: entry.duration,
      attachments: entry.attachments,
      infraReason,

      // Additional fields for compatibility
      time: String(entry.duration / 1000), // Convert ms to seconds
      file: entry.location,
    };

    failures.push(testFailure);
  }

  return failures;
}

export function getScoutCommandLineFromFailures(failures: ScoutTestFailureExtended[]): string {
  if (failures.length === 0) {
    return '';
  }

  // TODO: Use the command from the first failure as representative
  const firstFailure = failures[0] as TestFailure & { commandLine?: string };
  return firstFailure.commandLine || '';
}
