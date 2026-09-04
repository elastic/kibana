/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_ID_LENGTH = 255;
const MAX_CURSOR_LENGTH = 2048;
const MAX_TITLE_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 10_000;
const MAX_LABELS = 50;
const MAX_METADATA_ENTRIES = 50;
const TIMELESS_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const HTTPS_URL_PATTERN = /^https:\/\//i;
const LINEAR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

const linearId = (what: string) =>
  z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .regex(LINEAR_ID_PATTERN, {
      message: 'Must contain only letters, digits, hyphens, or underscores',
    })
    .describe(
      `${what} UUID or, where Linear supports it, a human-readable identifier such as ENG-42.`
    );

const relayPagination = {
  first: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum records to return. Defaults to 50 and cannot exceed 100.'),
  after: z
    .string()
    .min(1)
    .max(MAX_CURSOR_LENGTH)
    .optional()
    .describe('Relay cursor from pageInfo.endCursor on a previous response.'),
  orderBy: z
    .enum(['createdAt', 'updatedAt'])
    .optional()
    .describe('Sort field. Defaults to updatedAt.'),
};

const optionalTeamId = linearId('Team').optional().describe('Optional team UUID from listTeams.');

const isCalendarDate = (value: string): boolean => {
  if (!TIMELESS_DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const timelessDate = () =>
  z
    .string()
    .max(10)
    .refine(isCalendarDate, { message: 'Must be a valid YYYY-MM-DD calendar date' })
    .describe('Calendar date in Linear TimelessDate format: YYYY-MM-DD.');

const rfc3339Timestamp = (what: string) =>
  z
    .string()
    .max(64)
    .datetime({ offset: true, message: 'Must be an RFC 3339 timestamp with an offset' })
    .describe(`${what} inclusive RFC 3339 timestamp, for example 2026-09-01T00:00:00Z.`);

const labelIds = (allowEmpty: boolean) => {
  const schema = z
    .array(linearId('Issue label'))
    .max(MAX_LABELS)
    .describe('Issue label UUIDs from listIssueLabels.');
  return allowEmpty ? schema : schema.min(1);
};

const httpsUrl = (what: string) =>
  z
    .string()
    .url()
    .max(2048)
    .regex(HTTPS_URL_PATTERN, { message: 'Must be an https:// URL' })
    .describe(`${what} HTTPS URL.`);

export interface LinearCycleReference {
  id: string;
  name: string | null;
  number: number;
}

export interface LinearParentIssueReference {
  id: string;
  identifier: string;
  title: string;
}

export interface LinearTeamReference {
  id: string;
  name: string;
  key: string;
}

export interface LinearStateReference {
  id: string;
  name: string;
  type: string;
}

export interface LinearProjectReference {
  id: string;
  name: string;
  url: string;
}

export interface LinearAssigneeReference {
  id: string;
  name: string;
  displayName: string;
}

export interface LinearIssueResponse extends Record<string, unknown> {
  id: string;
  identifier: string;
  title: string;
  team: LinearTeamReference;
  state: LinearStateReference;
  project: LinearProjectReference | null;
  assignee: LinearAssigneeReference | null;
  cycle: LinearCycleReference | null;
  parent: LinearParentIssueReference | null;
}

export const ListTeamsInputSchema = lazySchema(() => z.object(relayPagination));

export const ListProjectsInputSchema = lazySchema(() =>
  z.object({
    teamId: optionalTeamId,
    ...relayPagination,
  })
);

export const ListTeamCollectionInputSchema = lazySchema(() =>
  z.object({
    teamId: linearId('Team').describe('Team UUID from listTeams.'),
    ...relayPagination,
  })
);

export const ListUsersInputSchema = lazySchema(() =>
  z.object({
    teamId: optionalTeamId,
    includeDisabled: z
      .boolean()
      .optional()
      .describe('Whether to include disabled users. Defaults to false.'),
    ...relayPagination,
  })
);

export const IssueFilterInputSchema = lazySchema(() =>
  z.object({
    teamId: optionalTeamId,
    projectId: linearId('Project').optional().describe('Project UUID.'),
    assigneeId: linearId('Assignee').optional().describe('User UUID.'),
    stateId: linearId('Workflow state').optional().describe('Workflow state UUID.'),
    labelIds: labelIds(false)
      .optional()
      .describe('Match issues carrying any of these issue label UUIDs.'),
    titleContains: z
      .string()
      .min(1)
      .max(500)
      .optional()
      .describe('Case-insensitive substring to match in the issue title.'),
    priority: z
      .number()
      .int()
      .min(0)
      .max(4)
      .optional()
      .describe('0=no priority, 1=urgent, 2=high, 3=medium, 4=low.'),
    createdAfter: rfc3339Timestamp('Created-at lower bound').optional(),
    createdBefore: rfc3339Timestamp('Created-at upper bound').optional(),
    updatedAfter: rfc3339Timestamp('Updated-at lower bound').optional(),
    updatedBefore: rfc3339Timestamp('Updated-at upper bound').optional(),
  })
);

export const ListIssuesInputSchema = lazySchema(() =>
  z.object({
    filter: IssueFilterInputSchema.optional().describe('Optional strongly typed issue filters.'),
    archivedStatus: z
      .enum(['active', 'archived', 'all'])
      .optional()
      .describe(
        'Archived status: active (default) excludes archived issues, archived returns only archived issues, and all includes both.'
      ),
    ...relayPagination,
  })
);

export const GetIssueInputSchema = lazySchema(() =>
  z.object({
    id: linearId('Issue').describe('Issue UUID or human-readable identifier, for example ENG-42.'),
  })
);

export const CreateIssueInputSchema = lazySchema(() =>
  z.object({
    teamId: linearId('Team').describe('Team UUID from listTeams.'),
    title: z.string().min(1).max(MAX_TITLE_LENGTH).describe('Issue title.'),
    description: z
      .string()
      .max(MAX_DESCRIPTION_LENGTH)
      .optional()
      .describe('Issue description in Markdown.'),
    assigneeId: linearId('Assignee').optional().describe('User UUID from listUsers.'),
    projectId: linearId('Project').optional().describe('Project UUID from listProjects.'),
    cycleId: linearId('Cycle').optional().describe('Optional Linear cycle UUID.'),
    parentId: linearId('Parent issue')
      .optional()
      .describe('Optional parent issue UUID or identifier.'),
    stateId: linearId('Workflow state')
      .optional()
      .describe('Workflow state UUID from listWorkflowStates.'),
    priority: z
      .number()
      .int()
      .min(0)
      .max(4)
      .optional()
      .describe('0=no priority, 1=urgent, 2=high, 3=medium, 4=low.'),
    dueDate: timelessDate().optional(),
    labelIds: labelIds(true)
      .optional()
      .describe('Complete initial set of issue label UUIDs from listIssueLabels.'),
  })
);

export const UpdateIssueInputSchema = lazySchema(() =>
  z
    .object({
      id: linearId('Issue').describe(
        'Issue UUID or human-readable identifier, for example ENG-42.'
      ),
      title: z.string().min(1).max(MAX_TITLE_LENGTH).optional().describe('New issue title.'),
      description: z
        .string()
        .max(MAX_DESCRIPTION_LENGTH)
        .nullable()
        .optional()
        .describe('New Markdown description, or null to clear it.'),
      assigneeId: linearId('Assignee')
        .nullable()
        .optional()
        .describe('New user UUID, or null to unassign.'),
      projectId: linearId('Project')
        .nullable()
        .optional()
        .describe('New project UUID, or null to remove the issue from its project.'),
      cycleId: linearId('Cycle')
        .nullable()
        .optional()
        .describe('New cycle UUID, or null to remove the issue from its cycle.'),
      parentId: linearId('Parent issue')
        .nullable()
        .optional()
        .describe('New parent issue UUID or identifier, or null to make this a top-level issue.'),
      stateId: linearId('Workflow state')
        .optional()
        .describe('New workflow state UUID from listWorkflowStates.'),
      priority: z
        .number()
        .int()
        .min(0)
        .max(4)
        .optional()
        .describe('0=no priority, 1=urgent, 2=high, 3=medium, 4=low.'),
      dueDate: timelessDate().nullable().optional().describe('New due date, or null to clear it.'),
      labelIds: labelIds(true)
        .optional()
        .describe('Replace the complete label set. Use [] to remove every label.'),
      addedLabelIds: labelIds(false)
        .optional()
        .describe('Add these labels without replacing the existing label set.'),
      removedLabelIds: labelIds(false)
        .optional()
        .describe('Remove these labels without replacing the existing label set.'),
    })
    .refine(
      (input) => Object.entries(input).some(([key, value]) => key !== 'id' && value !== undefined),
      { message: 'Provide at least one field to update' }
    )
    .refine(
      (input) =>
        input.labelIds === undefined ||
        (input.addedLabelIds === undefined && input.removedLabelIds === undefined),
      {
        message:
          'labelIds replaces the complete set and cannot be combined with addedLabelIds or removedLabelIds',
      }
    )
);

export const CreateCommentInputSchema = lazySchema(() =>
  z.object({
    issueId: linearId('Issue').describe(
      'Issue UUID or human-readable identifier, for example ENG-42.'
    ),
    body: z.string().min(1).max(MAX_DESCRIPTION_LENGTH).describe('Comment body in Markdown.'),
  })
);

export const CreateAttachmentInputSchema = lazySchema(() =>
  z.object({
    issueId: linearId('Issue').describe(
      'Issue UUID or human-readable identifier, for example ENG-42.'
    ),
    title: z.string().min(1).max(MAX_TITLE_LENGTH).describe('Attachment title.'),
    url: httpsUrl('Attachment'),
    subtitle: z.string().max(MAX_TITLE_LENGTH).optional().describe('Optional attachment subtitle.'),
    iconUrl: httpsUrl('Optional attachment icon')
      .optional()
      .describe(
        'Optional PNG or JPG icon URL. Linear allows at most 1 MB and recommends 20x20 pixels. The connector validates HTTPS only and does not fetch or verify the asset.'
      ),
    metadata: z
      .record(z.string().min(1).max(100), z.union([z.string().max(1000), z.number().finite()]))
      .refine((value) => Object.keys(value).length <= MAX_METADATA_ENTRIES, {
        message: `Metadata cannot contain more than ${MAX_METADATA_ENTRIES} entries`,
      })
      .optional()
      .describe('Optional metadata with at most 50 entries; values must be strings or numbers.'),
  })
);

export type RelayPaginationInput = z.infer<typeof ListTeamsInputSchema>;
export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;
export type ListTeamCollectionInput = z.infer<typeof ListTeamCollectionInputSchema>;
export type ListCyclesInput = ListTeamCollectionInput;
export type ListUsersInput = z.infer<typeof ListUsersInputSchema>;
export type IssueFilterInput = z.infer<typeof IssueFilterInputSchema>;
export type ListIssuesInput = z.infer<typeof ListIssuesInputSchema>;
export type GetIssueInput = z.infer<typeof GetIssueInputSchema>;
export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>;
export type UpdateIssueInput = z.infer<typeof UpdateIssueInputSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>;
export type CreateAttachmentInput = z.infer<typeof CreateAttachmentInputSchema>;
