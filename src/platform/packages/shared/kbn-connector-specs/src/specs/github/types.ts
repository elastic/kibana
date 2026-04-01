/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const GetMeInputSchema = z.object({});
export type GetMeInput = z.infer<typeof GetMeInputSchema>;

export const ListToolsInputSchema = z.object({});
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const SearchCodeInputSchema = z.object({
  query: z.string().min(1).describe('GitHub code search query'),
  page: z.number().optional().default(1),
  perPage: z.number().optional().default(10),
});
export type SearchCodeInput = z.infer<typeof SearchCodeInputSchema>;

export const SearchRepositoriesInputSchema = z.object({
  query: z.string().min(1).describe('GitHub repository search query'),
  page: z.number().optional().default(1),
  perPage: z.number().optional().default(10),
});
export type SearchRepositoriesInput = z.infer<typeof SearchRepositoriesInputSchema>;

export const SearchIssuesInputSchema = z.object({
  query: z.string().min(1).describe('GitHub issue search query'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  sort: z.string().optional().default('created'),
  page: z.number().optional().default(1),
  perPage: z.number().optional().default(10),
});
export type SearchIssuesInput = z.infer<typeof SearchIssuesInputSchema>;

export const SearchPullRequestsInputSchema = z.object({
  query: z.string().min(1).describe('GitHub pull request search query'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  sort: z.string().optional().default('created'),
  page: z.number().optional().default(1),
  perPage: z.number().optional().default(10),
});
export type SearchPullRequestsInput = z.infer<typeof SearchPullRequestsInputSchema>;

export const SearchUsersInputSchema = z.object({
  query: z.string().min(1).describe('GitHub user search query'),
  page: z.number().optional().default(1),
  perPage: z.number().optional().default(10),
});
export type SearchUsersInput = z.infer<typeof SearchUsersInputSchema>;

export const ListIssuesInputSchema = z.object({
  owner: z.string().min(1).describe('Repository owner (user or org)'),
  repo: z.string().min(1).describe('Repository name'),
  state: z.enum(['open', 'closed', 'all']).optional().default('open'),
  first: z.number().optional().default(10).describe('Number of results to return'),
  after: z.string().optional().describe('Cursor for pagination (endCursor from previous response)'),
});
export type ListIssuesInput = z.infer<typeof ListIssuesInputSchema>;

export const ListPullRequestsInputSchema = z.object({
  owner: z.string().min(1).describe('Repository owner (user or org)'),
  repo: z.string().min(1).describe('Repository name'),
  state: z.enum(['open', 'closed', 'all']).optional().default('open'),
  first: z.number().optional().default(10).describe('Number of results to return'),
  after: z.string().optional().describe('Cursor for pagination (endCursor from previous response)'),
});
export type ListPullRequestsInput = z.infer<typeof ListPullRequestsInputSchema>;

export const ListCommitsInputSchema = z.object({
  owner: z.string().min(1).describe('Repository owner (user or org)'),
  repo: z.string().min(1).describe('Repository name'),
  sha: z.string().optional().describe('Branch name or commit SHA to start listing from'),
  first: z.number().optional().default(10).describe('Number of results to return'),
  after: z.string().optional().describe('Cursor for pagination (endCursor from previous response)'),
});
export type ListCommitsInput = z.infer<typeof ListCommitsInputSchema>;

export const ListBranchesInputSchema = z.object({
  owner: z.string().min(1).describe('Repository owner (user or org)'),
  repo: z.string().min(1).describe('Repository name'),
  first: z.number().optional().default(10).describe('Number of results to return'),
  after: z.string().optional().describe('Cursor for pagination (endCursor from previous response)'),
});
export type ListBranchesInput = z.infer<typeof ListBranchesInputSchema>;

export const ListReleasesInputSchema = z.object({
  owner: z.string().min(1).describe('Repository owner (user or org)'),
  repo: z.string().min(1).describe('Repository name'),
  first: z.number().optional().default(10).describe('Number of results to return'),
  after: z.string().optional().describe('Cursor for pagination (endCursor from previous response)'),
});
export type ListReleasesInput = z.infer<typeof ListReleasesInputSchema>;

export const ListTagsInputSchema = z.object({
  owner: z.string().min(1).describe('Repository owner (user or org)'),
  repo: z.string().min(1).describe('Repository name'),
  first: z.number().optional().default(10).describe('Number of results to return'),
  after: z.string().optional().describe('Cursor for pagination (endCursor from previous response)'),
});
export type ListTagsInput = z.infer<typeof ListTagsInputSchema>;

export const GetCommitInputSchema = z.object({
  owner: z.string().min(1).describe('Repository owner (user or org)'),
  repo: z.string().min(1).describe('Repository name'),
  sha: z.string().min(1).describe('Commit SHA'),
});
export type GetCommitInput = z.infer<typeof GetCommitInputSchema>;

export const GetLatestReleaseInputSchema = z.object({
  owner: z.string().min(1).describe('Repository owner (user or org)'),
  repo: z.string().min(1).describe('Repository name'),
});
export type GetLatestReleaseInput = z.infer<typeof GetLatestReleaseInputSchema>;

export const PullRequestReadInputSchema = z.object({
  owner: z.string().min(1).describe('Repository owner (user or org)'),
  repo: z.string().min(1).describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  method: z
    .enum(['get', 'get_diff', 'get_review_comments'])
    .optional()
    .default('get')
    .describe('What to retrieve: full PR details, unified diff, or review comments'),
});
export type PullRequestReadInput = z.infer<typeof PullRequestReadInputSchema>;

export const GetFileContentsInputSchema = z.object({
  owner: z.string().min(1).describe('Repository owner (user or org)'),
  repo: z.string().min(1).describe('Repository name'),
  path: z.string().min(1).describe('File or directory path within the repository'),
  ref: z
    .string()
    .optional()
    .describe('Branch name, tag, or commit SHA (defaults to default branch)'),
});
export type GetFileContentsInput = z.infer<typeof GetFileContentsInputSchema>;

export const GetIssueInputSchema = z.object({
  owner: z.string().min(1).describe('Repository owner (user or org)'),
  repo: z.string().min(1).describe('Repository name'),
  issueNumber: z.number().describe('Issue number'),
});
export type GetIssueInput = z.infer<typeof GetIssueInputSchema>;

export const GetIssueCommentsInputSchema = z.object({
  owner: z.string().min(1).describe('Repository owner (user or org)'),
  repo: z.string().min(1).describe('Repository name'),
  issueNumber: z.number().describe('Issue number'),
});
export type GetIssueCommentsInput = z.infer<typeof GetIssueCommentsInputSchema>;

export const CallToolInputSchema = z.object({
  name: z.string().min(1).describe('Name of the MCP tool to call'),
  arguments: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Arguments to pass to the tool (tool-specific)'),
});
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
