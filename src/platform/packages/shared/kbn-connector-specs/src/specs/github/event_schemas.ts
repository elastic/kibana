/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const identifier = () => z.number().int().nonnegative();

const UserSchema = lazySchema(() =>
  z.looseObject({
    id: identifier().optional(),
    login: z.string().optional(),
    html_url: z.string().optional(),
    type: z.string().optional(),
  })
);

const RepositorySchema = lazySchema(() =>
  z.looseObject({
    id: identifier().optional(),
    name: z.string().optional(),
    full_name: z.string().optional(),
    html_url: z.string().optional(),
    private: z.boolean().optional(),
    default_branch: z.string().optional(),
    owner: UserSchema.nullable().optional(),
  })
);

const IssueSchema = lazySchema(() =>
  z.looseObject({
    id: identifier().optional(),
    number: identifier().optional(),
    title: z.string().optional(),
    body: z.string().nullable().optional(),
    state: z.string().optional(),
    html_url: z.string().optional(),
    user: UserSchema.nullable().optional(),
    assignee: UserSchema.nullable().optional(),
    labels: z
      .array(z.looseObject({ name: z.string().optional() }).nullable())
      .max(1000)
      .optional(),
  })
);

const PullRequestSchema = lazySchema(() =>
  IssueSchema.extend({
    merged: z.boolean().nullable().optional().describe('True when the pull request was merged.'),
    merged_at: z.string().nullable().optional(),
    merged_by: UserSchema.nullable().optional(),
    draft: z.boolean().optional(),
    head: z.looseObject({ ref: z.string().optional(), sha: z.string().optional() }).optional(),
    base: z.looseObject({ ref: z.string().optional(), sha: z.string().optional() }).optional(),
  })
);

const CommonBodySchema = lazySchema(() =>
  z.looseObject({
    action: z.string().optional().describe('GitHub lifecycle action, when supplied.'),
    repository: RepositorySchema.optional(),
    sender: UserSchema.optional().describe('GitHub actor supplied with the event.'),
    organization: z
      .looseObject({ id: identifier().optional(), login: z.string().optional() })
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
          body: z.string().optional(),
          html_url: z.string().optional(),
          user: UserSchema.nullable().optional(),
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
          state: z.string().optional(),
          body: z.string().nullable().optional(),
          html_url: z.string().optional(),
          user: UserSchema.nullable().optional(),
          commit_id: z.string().optional(),
          submitted_at: z.string().nullable().optional(),
        })
        .optional(),
    }),
  })
);

const CommitSchema = lazySchema(() =>
  z.looseObject({
    id: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.string().optional(),
    url: z.string().optional(),
  })
);

export const GithubPushEventSchema = lazySchema(() =>
  z.object({
    eventType: z.literal('push'),
    body: CommonBodySchema.extend({
      ref: z.string().optional(),
      before: z.string().optional(),
      after: z.string().optional(),
      created: z.boolean().optional(),
      deleted: z.boolean().optional(),
      forced: z.boolean().optional(),
      compare: z.string().optional(),
      head_commit: CommitSchema.nullable().optional(),
      commits: z.array(CommitSchema).max(2048).optional(),
      pusher: z
        .looseObject({ name: z.string().optional(), email: z.string().nullable().optional() })
        .optional(),
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
          tag_name: z.string().optional(),
          name: z.string().nullable().optional(),
          body: z.string().nullable().optional(),
          html_url: z.string().optional(),
          draft: z.boolean().optional(),
          prerelease: z.boolean().optional(),
          published_at: z.string().nullable().optional(),
          author: UserSchema.nullable().optional(),
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
          ref: z.string().optional(),
          sha: z.string().optional(),
          environment: z.string().optional(),
          task: z.string().optional(),
          description: z.string().nullable().optional(),
          creator: UserSchema.nullable().optional(),
        })
        .optional(),
      deployment_status: z
        .looseObject({
          id: identifier().optional(),
          state: z
            .string()
            .optional()
            .describe('Deployment outcome, such as success, failure, or error.'),
          environment: z.string().optional(),
          environment_url: z.string().optional(),
          log_url: z.string().optional(),
          description: z.string().nullable().optional(),
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
          name: z.string().optional(),
          head_sha: z.string().optional(),
          status: z.string().optional(),
          conclusion: z
            .string()
            .nullable()
            .optional()
            .describe('Check outcome, such as success or failure.'),
          html_url: z.string().optional(),
          details_url: z.string().nullable().optional(),
          started_at: z.string().nullable().optional(),
          completed_at: z.string().nullable().optional(),
        })
        .optional(),
    }),
  })
);
