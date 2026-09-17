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
      .max(10000)
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
      .max(2000)
      .optional()
      .describe('Pagination token from a previous response to fetch the next page of results'),
  })
);
export type SearchIssuesWithJqlInput = z.infer<typeof SearchIssuesWithJqlInputSchema>;

export const GetIssueInputSchema = lazySchema(() =>
  z.object({
    issueId: z
      .string()
      .max(200)
      .describe('Issue key (e.g., PROJ-123) or numeric issue ID (e.g., 10042)'),
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
      .max(255)
      .optional()
      .describe(
        'Text to filter projects by name or key (e.g., "Marketing" or "MKTG"). Leave empty to list all projects.'
      ),
  })
);
export type GetProjectsInput = z.infer<typeof GetProjectsInputSchema>;

export const GetProjectInputSchema = lazySchema(() =>
  z.object({
    projectId: z
      .string()
      .max(200)
      .describe('Project key (e.g., PROJ) or numeric project ID (e.g., 10000)'),
  })
);
export type GetProjectInput = z.infer<typeof GetProjectInputSchema>;

export const SearchUsersInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .max(255)
      .optional()
      .describe(
        'Free-text search string matched against display name, username, or email (e.g., "john.doe" or "John")'
      ),
    username: z
      .string()
      .max(255)
      .optional()
      .describe("User's username or email address for exact lookup"),
    accountId: z
      .string()
      .max(200)
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
      .max(255)
      .optional()
      .describe(
        'A query string used to search user properties. Property keys and values must not exceed 100 characters.'
      ),
  })
);
export type SearchUsersInput = z.infer<typeof SearchUsersInputSchema>;

// =============================================================================
// Write action input schemas
// =============================================================================

export const CreateIssueInputSchema = lazySchema(() =>
  z.object({
    projectKey: z
      .string()
      .max(100)
      .describe('Project key (e.g. PROJ). Use getProjects to discover keys.'),
    summary: z.string().min(1).max(255).describe('Issue title / summary line.'),
    issueType: z
      .string()
      .max(255)
      .describe(
        'Issue type name (e.g. Bug, Task, Story) or numeric ID. ' +
          'Required by Jira — use getIssueTypes to list valid types for the project.'
      ),
    description: z
      .string()
      .max(32768)
      .optional()
      .describe('Issue body in plain text. Newlines become separate paragraphs in Jira.'),
    priority: z
      .string()
      .max(100)
      .optional()
      .describe('Priority name (e.g. Highest, High, Medium, Low, Lowest).'),
    labels: z
      .array(z.string().max(255))
      .max(50)
      .optional()
      .describe('Labels to apply. Labels cannot contain spaces.'),
    assigneeAccountId: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Atlassian account ID of the assignee. Use searchUsers to resolve a name or email to an accountId.'
      ),
    parent: z
      .string()
      .max(200)
      .optional()
      .describe('Parent issue key (e.g. PROJ-10). Required when creating a subtask.'),
  })
);
export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>;

export const UpdateIssueInputSchema = lazySchema(() =>
  z
    .object({
      issueId: z
        .string()
        .max(200)
        .describe('Issue key (e.g. PROJ-123) or numeric issue ID to update.'),
      summary: z.string().min(1).max(255).optional().describe('New summary / title for the issue.'),
      description: z
        .string()
        .max(32768)
        .optional()
        .describe('New description in plain text. Replaces the existing description entirely.'),
      issueType: z.string().max(255).optional().describe('New issue type name or numeric ID.'),
      priority: z
        .string()
        .max(100)
        .optional()
        .describe('New priority name (e.g. High, Medium, Low).'),
      labels: z
        .array(z.string().max(255))
        .max(50)
        .optional()
        .describe('Replacement label set. Replaces all existing labels.'),
      assigneeAccountId: z
        .string()
        .max(200)
        .nullable()
        .optional()
        .describe(
          'Atlassian account ID to assign the issue to, or null to unassign. ' +
            'Use searchUsers to resolve a name or email to an accountId.'
        ),
      parent: z
        .string()
        .max(200)
        .optional()
        .describe('New parent issue key. Pass to re-parent a subtask.'),
    })
    .refine(
      ({ summary, description, issueType, priority, labels, assigneeAccountId, parent }) =>
        [summary, description, issueType, priority, labels, assigneeAccountId, parent].some(
          (v) => v !== undefined
        ),
      { message: 'At least one field must be provided to update' }
    )
);
export type UpdateIssueInput = z.infer<typeof UpdateIssueInputSchema>;

export const AddCommentInputSchema = lazySchema(() =>
  z.object({
    issueId: z
      .string()
      .max(200)
      .describe('Issue key (e.g. PROJ-123) or numeric issue ID to comment on.'),
    body: z
      .string()
      .min(1)
      .max(32768)
      .describe('Comment text in plain text. Newlines become separate paragraphs.'),
  })
);
export type AddCommentInput = z.infer<typeof AddCommentInputSchema>;

export const TransitionIssueInputSchema = lazySchema(() =>
  z.object({
    issueId: z
      .string()
      .max(200)
      .describe('Issue key (e.g. PROJ-123) or numeric issue ID to transition.'),
    transitionId: z
      .string()
      .max(100)
      .describe(
        'Transition ID (not a status name). Use getTransitions to list valid transition IDs for the issue.'
      ),
  })
);
export type TransitionIssueInput = z.infer<typeof TransitionIssueInputSchema>;

// =============================================================================
// Should-have action input schemas
// =============================================================================

export const GetTransitionsInputSchema = lazySchema(() =>
  z.object({
    issueId: z
      .string()
      .max(200)
      .describe(
        'Issue key (e.g. PROJ-123) or numeric issue ID. ' +
          'Returns the transition IDs and target status names available for this issue. ' +
          'Call this before transitionIssue — Jira requires a transition ID, not a status name.'
      ),
  })
);
export type GetTransitionsInput = z.infer<typeof GetTransitionsInputSchema>;

export const GetIssueTypesInputSchema = lazySchema(() =>
  z.object({
    projectKey: z
      .string()
      .max(100)
      .describe(
        'Project key (e.g. PROJ). Returns the issue types available in this project, ' +
          'including their IDs and names. Use the ID or name in createIssue.issueType.'
      ),
  })
);
export type GetIssueTypesInput = z.infer<typeof GetIssueTypesInputSchema>;

export const GetCreateMetadataInputSchema = lazySchema(() =>
  z.object({
    projectKey: z.string().max(100).describe('Project key (e.g. PROJ).'),
    issueTypeId: z
      .string()
      .max(100)
      .describe(
        'Issue type ID (numeric). Use getIssueTypes to get the ID for a given issue type name. ' +
          'Returns the required and optional fields for creating an issue of this type, ' +
          'so a valid createIssue payload can be built.'
      ),
  })
);
export type GetCreateMetadataInput = z.infer<typeof GetCreateMetadataInputSchema>;

export const AssignIssueInputSchema = lazySchema(() =>
  z.object({
    issueId: z
      .string()
      .max(200)
      .describe('Issue key (e.g. PROJ-123) or numeric issue ID to assign.'),
    accountId: z
      .string()
      .max(200)
      .nullable()
      .describe(
        'Atlassian account ID of the new assignee. ' +
          'Use searchUsers to resolve a name or email to an accountId. ' +
          'Pass "-1" to assign to the project default assignee. ' +
          'Pass null to unassign.'
      ),
  })
);
export type AssignIssueInput = z.infer<typeof AssignIssueInputSchema>;

export const AddAttachmentInputSchema = lazySchema(() =>
  z.object({
    issueId: z
      .string()
      .max(200)
      .describe('Issue key (e.g. PROJ-123) or numeric issue ID to attach the file to.'),
    file: z.string().base64().max(10_000_000).describe('Base64-encoded file content.'),
    filename: z.string().max(255).describe('Filename including extension (e.g. screenshot.png).'),
  })
);
export type AddAttachmentInput = z.infer<typeof AddAttachmentInputSchema>;

// =============================================================================
// Nice-to-have action input schemas
// =============================================================================

export const GetAttachmentInputSchema = lazySchema(() =>
  z.object({
    attachmentId: z
      .string()
      .max(100)
      .describe(
        'Attachment ID (numeric string). Found in the attachments array of a getIssue response. ' +
          'Returns the file content as a base64-encoded string.'
      ),
  })
);
export type GetAttachmentInput = z.infer<typeof GetAttachmentInputSchema>;

export const LinkIssuesInputSchema = lazySchema(() =>
  z.object({
    inwardIssueKey: z.string().max(200).describe('Key of the inward issue (e.g. PROJ-10).'),
    outwardIssueKey: z.string().max(200).describe('Key of the outward issue (e.g. PROJ-20).'),
    linkType: z
      .string()
      .max(255)
      .describe(
        'Link type name as configured in your Jira instance (e.g. "Relates", "Blocks", "Duplicate"). ' +
          'The value is case-sensitive and must match exactly — use the type name, not its directional description ' +
          '(e.g. "Relates" not "relates to"). Available names depend on the instance configuration.'
      ),
    comment: z
      .string()
      .max(32768)
      .optional()
      .describe('Optional comment to add to the link in plain text.'),
  })
);
export type LinkIssuesInput = z.infer<typeof LinkIssuesInputSchema>;

export const DeleteIssueInputSchema = lazySchema(() =>
  z.object({
    issueId: z
      .string()
      .max(200)
      .describe('Issue key (e.g. PROJ-123) or numeric issue ID to delete. This is irreversible.'),
    deleteSubtasks: z
      .boolean()
      .optional()
      .describe(
        'Set to true to also delete all subtasks of this issue. ' +
          'Required when the issue has subtasks; Jira returns a 400 otherwise.'
      ),
  })
);
export type DeleteIssueInput = z.infer<typeof DeleteIssueInputSchema>;

export const AddWatcherInputSchema = lazySchema(() =>
  z.object({
    issueId: z
      .string()
      .max(200)
      .describe('Issue key (e.g. PROJ-123) or numeric issue ID to add a watcher to.'),
    accountId: z
      .string()
      .max(200)
      .describe(
        'Atlassian account ID of the user to add as a watcher. ' +
          'Use searchUsers to resolve a name or email to an accountId.'
      ),
  })
);
export type AddWatcherInput = z.infer<typeof AddWatcherInputSchema>;

export const RemoveWatcherInputSchema = lazySchema(() =>
  z.object({
    issueId: z
      .string()
      .max(200)
      .describe('Issue key (e.g. PROJ-123) or numeric issue ID to remove a watcher from.'),
    accountId: z.string().max(200).describe('Atlassian account ID of the watcher to remove.'),
  })
);
export type RemoveWatcherInput = z.infer<typeof RemoveWatcherInputSchema>;
