/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const text = () => z.string().max(65_536);
const identifier = () => z.number().int().nonnegative();

const UserSchema = lazySchema(() =>
  z.looseObject({
    id: identifier().optional(),
    login: text().optional(),
    html_url: text().optional(),
    type: text().optional(),
  })
);

const RepositorySchema = lazySchema(() =>
  z.looseObject({
    id: identifier().optional(),
    name: text().optional(),
    full_name: text().optional(),
    html_url: text().optional(),
    private: z.boolean().optional(),
    default_branch: text().optional(),
    owner: UserSchema.optional(),
  })
);

const IssueSchema = lazySchema(() =>
  z.looseObject({
    id: identifier().optional(),
    number: identifier().optional(),
    title: text().optional(),
    body: text().nullable().optional(),
    state: text().optional(),
    html_url: text().optional(),
    user: UserSchema.optional(),
    assignee: UserSchema.nullable().optional(),
    labels: z
      .array(z.looseObject({ name: text().optional() }))
      .max(1000)
      .optional(),
  })
);

const PullRequestSchema = lazySchema(() =>
  IssueSchema.extend({
    merged: z.boolean().optional().describe('True when the pull request was merged.'),
    merged_at: text().nullable().optional(),
    merged_by: UserSchema.nullable().optional(),
    draft: z.boolean().optional(),
    head: z.looseObject({ ref: text().optional(), sha: text().optional() }).optional(),
    base: z.looseObject({ ref: text().optional(), sha: text().optional() }).optional(),
  })
);

const CommonBodySchema = lazySchema(() =>
  z.looseObject({
    action: text().optional().describe('GitHub lifecycle action, when supplied.'),
    repository: RepositorySchema.optional(),
    sender: UserSchema.optional().describe('GitHub actor supplied with the event.'),
    organization: z
      .looseObject({ id: identifier().optional(), login: text().optional() })
      .optional(),
  })
);

export const GithubIssuesEventSchema = lazySchema(() =>
  z.object({
    eventType: z.literal('issues'),
    body: CommonBodySchema.extend({ issue: IssueSchema.optional() }),
  })
);

export const GithubIssueCommentEventSchema = lazySchema(() =>
  z.object({
    eventType: z.literal('issue_comment'),
    body: CommonBodySchema.extend({
      issue: IssueSchema.optional(),
      comment: z
        .looseObject({
          id: identifier().optional(),
          body: text().optional(),
          html_url: text().optional(),
          user: UserSchema.optional(),
        })
        .optional(),
    }),
  })
);

export const GithubPullRequestEventSchema = lazySchema(() =>
  z.object({
    eventType: z.literal('pull_request'),
    body: CommonBodySchema.extend({
      number: identifier().optional(),
      pull_request: PullRequestSchema.optional(),
    }),
  })
);

export const GithubPullRequestReviewEventSchema = lazySchema(() =>
  z.object({
    eventType: z.literal('pull_request_review'),
    body: CommonBodySchema.extend({
      pull_request: PullRequestSchema.optional(),
      review: z
        .looseObject({
          id: identifier().optional(),
          state: text().optional(),
          body: text().nullable().optional(),
          html_url: text().optional(),
          user: UserSchema.optional(),
          commit_id: text().optional(),
          submitted_at: text().nullable().optional(),
        })
        .optional(),
    }),
  })
);

const CommitSchema = lazySchema(() =>
  z.looseObject({
    id: text().optional(),
    message: text().optional(),
    timestamp: text().optional(),
    url: text().optional(),
  })
);

export const GithubPushEventSchema = lazySchema(() =>
  z.object({
    eventType: z.literal('push'),
    body: CommonBodySchema.extend({
      ref: text().optional(),
      before: text().optional(),
      after: text().optional(),
      created: z.boolean().optional(),
      deleted: z.boolean().optional(),
      forced: z.boolean().optional(),
      compare: text().optional(),
      head_commit: CommitSchema.nullable().optional(),
      commits: z.array(CommitSchema).max(2048).optional(),
      pusher: z.looseObject({ name: text().optional(), email: text().optional() }).optional(),
    }),
  })
);

export const GithubReleaseEventSchema = lazySchema(() =>
  z.object({
    eventType: z.literal('release'),
    body: CommonBodySchema.extend({
      release: z
        .looseObject({
          id: identifier().optional(),
          tag_name: text().optional(),
          name: text().nullable().optional(),
          body: text().nullable().optional(),
          html_url: text().optional(),
          draft: z.boolean().optional(),
          prerelease: z.boolean().optional(),
          published_at: text().nullable().optional(),
          author: UserSchema.optional(),
        })
        .optional(),
    }),
  })
);

export const GithubDeploymentStatusEventSchema = lazySchema(() =>
  z.object({
    eventType: z.literal('deployment_status'),
    body: CommonBodySchema.extend({
      deployment: z
        .looseObject({
          id: identifier().optional(),
          ref: text().optional(),
          sha: text().optional(),
          environment: text().optional(),
          task: text().optional(),
          description: text().nullable().optional(),
          creator: UserSchema.nullable().optional(),
        })
        .optional(),
      deployment_status: z
        .looseObject({
          id: identifier().optional(),
          state: text()
            .optional()
            .describe('Deployment outcome, such as success, failure, or error.'),
          environment: text().optional(),
          environment_url: text().optional(),
          log_url: text().optional(),
          description: text().nullable().optional(),
          creator: UserSchema.nullable().optional(),
        })
        .optional(),
    }),
  })
);

export const GithubCheckRunEventSchema = lazySchema(() =>
  z.object({
    eventType: z.literal('check_run'),
    body: CommonBodySchema.extend({
      check_run: z
        .looseObject({
          id: identifier().optional(),
          name: text().optional(),
          head_sha: text().optional(),
          status: text().optional(),
          conclusion: text()
            .nullable()
            .optional()
            .describe('Check outcome, such as success or failure.'),
          html_url: text().optional(),
          details_url: text().nullable().optional(),
          started_at: text().nullable().optional(),
          completed_at: text().nullable().optional(),
        })
        .optional(),
    }),
  })
);
