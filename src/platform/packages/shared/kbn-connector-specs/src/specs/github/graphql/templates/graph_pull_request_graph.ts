/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { GitHubQueryTemplate } from '../types';

export const graphPullRequestGraphTemplate: GitHubQueryTemplate = {
  id: 'graph.pullRequestGraph',
  description:
    'Fetch a pull request with reviews, review threads, and linked closing issues.',
  document: `
    query GraphPullRequest($owner: String!, $repo: String!, $number: Int!) {
      rateLimit {
        cost
        remaining
        limit
        resetAt
      }
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          id
          number
          title
          state
          url
          body
          createdAt
          updatedAt
          mergedAt
          isDraft
          author {
            login
          }
          reviews(first: 30) {
            nodes {
              id
              state
              submittedAt
              body
              author {
                login
              }
            }
          }
          reviewThreads(first: 30) {
            nodes {
              isResolved
              comments(first: 20) {
                nodes {
                  id
                  body
                  createdAt
                  author {
                    login
                  }
                }
              }
            }
          }
          closingIssuesReferences(first: 20) {
            nodes {
              id
              number
              title
              url
            }
          }
        }
      }
    }
  `,
  variablesSchema: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    number: z.number().int(),
  }) as z.ZodType<Record<string, unknown>>,
  resultPath: 'repository.pullRequest',
  isPaginated: false,
};
