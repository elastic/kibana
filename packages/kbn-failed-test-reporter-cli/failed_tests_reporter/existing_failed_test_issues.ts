/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout } from 'timers/promises';

import { isAxiosRequestError, isAxiosResponseError } from '@kbn/dev-utils';
import type { ToolingLog } from '@kbn/tooling-log';
import Axios from 'axios';

import type { TestFailure } from './get_failures';
import type { GithubIssueMini } from './github_api';

export interface FailedTestIssue {
  classname: string;
  name: string;
  github: {
    nodeId: string;
    number: number;
    htmlUrl: string;
    body: string;
  };
}

interface FindFailedTestIssuesResponse {
  existingIssues: FailedTestIssue[];
}

export interface ExistingFailedTestIssue extends FailedTestIssue {
  github: FailedTestIssue['github'] & {
    body: string;
  };
}

const BASE_URL = 'https://ci-stats.kibana.dev';

/**
 * In order to deal with rate limits imposed on our Github API tokens we needed
 * to stop iterating through all the Github issues to find previously created issues
 * for a test failure. This class uses the ci-stats API to lookup the mapping between
 * failed tests and the existing failed-tests issues. The API maintains an index of
 * this mapping in ES to make much better use of the Github API.
 */
export class ExistingFailedTestIssues {
  private readonly results = new Map<TestFailure, ExistingFailedTestIssue | undefined>();

  constructor(private readonly log: ToolingLog) {}

  async loadForFailures(newFailures: TestFailure[]) {
    const unseenFailures: TestFailure[] = [];
    for (const failure of newFailures) {
      if (!this.isFailureSeen(failure)) {
        unseenFailures.push(failure);
      }
    }

    if (unseenFailures.length === 0) {
      this.log.debug('no unseen issues in new batch of failures');
      return;
    }

    this.log.debug('finding', unseenFailures.length, 'existing issues via ci-stats');
    const failedTestIssues = await this.findExistingIssues(unseenFailures);
    this.log.debug('found', failedTestIssues.length, 'existing issues');

    const initialResultSize = this.results.size;
    for (const failure of unseenFailures) {
      const ciStatsIssue = failedTestIssues.find(
        (i) => i.classname === failure.classname && i.name === failure.name
      );
      if (!ciStatsIssue) {
        this.results.set(failure, undefined);
        continue;
      }

      this.results.set(failure, ciStatsIssue);
    }

    this.log.debug('loaded', this.results.size - initialResultSize, 'existing test issues');
  }

  isScoutFailure(failure: TestFailure): boolean {
    return 'id' in failure && 'target' in failure && 'location' in failure;
  }

  getForFailure(failure: TestFailure) {
    // Check if this is a Scout failure
    const isScout = this.isScoutFailure(failure);

    for (const [f, issue] of this.results) {
      if (!issue) {
        continue;
      }

      // Verify both input and key are the same type (both Scout or both FTR)
      const isKeyScoutFailure = this.isScoutFailure(f);

      if (isScout) {
        // For Scout failures, match by test name only (ignore target)
        // Both must be Scout failures and names must match
        if (isKeyScoutFailure && f.name === failure.name) {
          return issue;
        }
      } else {
        // For FTR failures, match by classname and name
        // Both must be FTR failures (not Scout) and classname+name must match
        if (!isKeyScoutFailure && f.classname === failure.classname && f.name === failure.name) {
          return issue;
        }
      }
    }

    return undefined;
  }

  addNewlyCreated(failure: TestFailure, newIssue: GithubIssueMini) {
    this.results.set(failure, {
      classname: failure.classname,
      name: failure.name,
      github: {
        body: newIssue.body,
        htmlUrl: newIssue.html_url,
        nodeId: newIssue.node_id,
        number: newIssue.number,
      },
    });
  }

  private async findExistingIssues(failures: TestFailure[]) {
    if (failures.length === 0) {
      return [];
    }

    const maxAttempts = 5;
    let attempt = 0;
    while (true) {
      attempt += 1;

      try {
        const resp = await Axios.request<FindFailedTestIssuesResponse>({
          method: 'POST',
          baseURL: BASE_URL,
          allowAbsoluteUrls: false,
          url: '/v1/find_failed_test_issues',
          data: {
            failures: failures.map((f) => ({
              classname: f.classname,
              name: f.name,
            })),
          },
        });

        return resp.data.existingIssues;
      } catch (error: unknown) {
        if (
          attempt < maxAttempts &&
          ((isAxiosResponseError(error) && error.response.status >= 500) ||
            isAxiosRequestError(error))
        ) {
          this.log.error(error);
          this.log.warning(`Failure talking to ci-stats, waiting ${attempt} before retrying`);
          await setTimeout(attempt * 1000);
          continue;
        }

        throw error;
      }
    }
  }

  private isFailureSeen(failure: TestFailure) {
    // Check if this is a Scout failure
    const isScout = this.isScoutFailure(failure);

    for (const seen of this.results.keys()) {
      if (isScout) {
        // For Scout failures, match by test name only (ignore target)
        const isExistingScoutFailure = this.isScoutFailure(seen);
        if (isExistingScoutFailure && seen.name === failure.name) {
          return true;
        }
      } else {
        // For FTR failures, use original matching logic
        if (seen.classname === failure.classname && seen.name === failure.name) {
          return true;
        }
      }
    }

    return false;
  }
}
