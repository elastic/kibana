/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const SearchIssuesWithJqlInputSchema = lazySchema(() =>
  z.object({
    jql: z
      .string()
      .describe(
        'JQL query string to filter issues. ' +
          'Operators: = != ~ (contains) IN NOT IN > >= < <=. Combine with AND/OR. ' +
          'Date functions: startOfDay(), endOfDay(), startOfWeek(), endOfWeek(), startOfMonth(). ' +
          'Use ORDER BY to sort, e.g. ORDER BY updated DESC. ' +
          'Examples: "project = PROJ AND status = \\"In Progress\\"", ' +
          '"assignee = currentUser() AND priority = High", ' +
          '"created >= -7d ORDER BY created DESC", ' +
          '"project = PROJ AND labels = \\"bug\\" AND status != Done". ' +
          'To filter by user, get accountId from searchUsers and use: assignee = "accountId".'
      ),
    maxResults: z
      .number()
      .optional()
      .describe('Maximum number of issues to return per page (default determined by Jira API)'),
    nextPageToken: z
      .string()
      .optional()
      .describe('Pagination token from a previous response to fetch the next page of results'),
  })
);
export type SearchIssuesWithJqlInput = z.infer<typeof SearchIssuesWithJqlInputSchema>;

export const GetIssueInputSchema = lazySchema(() =>
  z.object({
    issueId: z.string().describe('Issue key (e.g., PROJ-123) or numeric issue ID (e.g., 10042)'),
  })
);
export type GetIssueInput = z.infer<typeof GetIssueInputSchema>;

export const GetProjectsInputSchema = lazySchema(() =>
  z.object({
    maxResults: z
      .number()
      .optional()
      .describe('Maximum number of projects to return (default determined by Jira API)'),
    startAt: z
      .number()
      .optional()
      .describe(
        'Zero-based index of the first project to return, for pagination (e.g., 0, 20, 40)'
      ),
    query: z
      .string()
      .optional()
      .describe(
        'Text to filter projects by name or key (e.g., "Marketing" or "MKTG"). Leave empty to list all projects.'
      ),
  })
);
export type GetProjectsInput = z.infer<typeof GetProjectsInputSchema>;

export const GetProjectInputSchema = lazySchema(() =>
  z.object({
    projectId: z.string().describe('Project key (e.g., PROJ) or numeric project ID (e.g., 10000)'),
  })
);
export type GetProjectInput = z.infer<typeof GetProjectInputSchema>;

export const SearchUsersInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .optional()
      .describe(
        'Free-text search string matched against display name, username, or email (e.g., "john.doe" or "John")'
      ),
    username: z.string().optional().describe("User's username or email address for exact lookup"),
    accountId: z
      .string()
      .optional()
      .describe("User's Atlassian account ID for exact lookup (e.g., 5b10ac8d82e05b22cc7d4ef5)"),
    startAt: z
      .number()
      .optional()
      .describe('Zero-based index of the first user to return, for pagination (e.g., 0, 10, 20)'),
    maxResults: z
      .number()
      .optional()
      .describe('Maximum number of users to return (default determined by Jira API)'),
    property: z
      .string()
      .optional()
      .describe(
        'A query string used to search user properties. Property keys and values must not exceed 100 characters.'
      ),
  })
);
export type SearchUsersInput = z.infer<typeof SearchUsersInputSchema>;
