/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
import { z, lazySchema } from '@kbn/zod/v4';

const tolerant = <T extends z.ZodType>(schema: T) => schema.nullish().catch(undefined);

const RawUserSchema = lazySchema(() => z.looseObject({ login: tolerant(z.string()) }));

const RawGitIdentitySchema = lazySchema(() =>
  z.looseObject({ name: tolerant(z.string()), date: tolerant(z.string()) })
);

const RawTimelineEventSchema = lazySchema(() =>
  z.looseObject({
    id: tolerant(z.number()),
    event: z.string(),
    created_at: tolerant(z.string()),
    submitted_at: tolerant(z.string()),
    actor: tolerant(RawUserSchema),
    user: tolerant(RawUserSchema),
    assignee: tolerant(RawUserSchema),
    label: tolerant(z.looseObject({ name: tolerant(z.string()) })),
    state_reason: tolerant(z.string()),
    state: tolerant(z.string()),
    author_association: tolerant(z.string()),
    html_url: tolerant(z.string()),
    commit_id: tolerant(z.string()),
    sha: tolerant(z.string()),
    author: tolerant(RawGitIdentitySchema),
    committer: tolerant(RawGitIdentitySchema),
    requested_reviewer: tolerant(RawUserSchema),
    requested_team: tolerant(z.looseObject({ slug: tolerant(z.string()) })),
    rename: tolerant(z.looseObject({ from: tolerant(z.string()), to: tolerant(z.string()) })),
    source: tolerant(
      z.looseObject({
        issue: tolerant(
          z.looseObject({
            number: tolerant(z.number()),
            html_url: tolerant(z.string()),
            repository: tolerant(z.looseObject({ full_name: tolerant(z.string()) })),
            pull_request: tolerant(z.looseObject({})),
          })
        ),
      })
    ),
  })
);

type RawTimelineEvent = z.infer<typeof RawTimelineEventSchema>;

export interface TimelineEvent {
  event: string;
  id?: number;
  createdAt?: string;
  actor?: string;
  assignee?: string;
  label?: string;
  stateReason?: string;
  reviewState?: string;
  requestedReviewer?: string;
  requestedTeam?: string;
  authorAssociation?: string;
  url?: string;
  commitId?: string;
  sha?: string;
  authorName?: string;
  rename?: { from: string; to: string };
  source?: { repo: string; number: number; isPullRequest: boolean; url: string };
}

export interface TimelineResponse {
  data: readonly object[];
  headers: RawAxiosResponseHeaders | AxiosResponseHeaders;
}

export interface TimelinePage {
  events: TimelineEvent[];
  page: number;
  nextPage: number | null;
  hasMore: boolean;
}

const withoutUndefined = <T extends object>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;

const toSource = (source: RawTimelineEvent['source']): TimelineEvent['source'] => {
  const issue = source?.issue;
  const repo = issue?.repository?.full_name;
  const number = issue?.number;
  const url = issue?.html_url;
  if (!issue || !repo || typeof number !== 'number' || !url) {
    return undefined;
  }
  return { repo, number, isPullRequest: Boolean(issue.pull_request), url };
};

const toRename = (rename: RawTimelineEvent['rename']): TimelineEvent['rename'] => {
  const from = rename?.from;
  const to = rename?.to;
  if (typeof from !== 'string' || typeof to !== 'string') {
    return undefined;
  }
  return { from, to };
};

export const normalizeTimelineEvent = (raw: object): TimelineEvent | undefined => {
  const parsed = RawTimelineEventSchema.safeParse(raw);
  if (!parsed.success) {
    return undefined;
  }
  const {
    id,
    event,
    created_at: createdAt,
    submitted_at: submittedAt,
    actor,
    user,
    assignee,
    label,
    state_reason: stateReason,
    state,
    author_association: authorAssociation,
    html_url: url,
    commit_id: commitId,
    sha,
    author,
    committer,
    requested_reviewer: requestedReviewer,
    requested_team: requestedTeam,
    rename,
    source,
  } = parsed.data;

  return withoutUndefined<TimelineEvent>({
    id: id ?? undefined,
    event,
    createdAt: createdAt ?? submittedAt ?? committer?.date ?? author?.date ?? undefined,
    actor: actor?.login ?? user?.login ?? undefined,
    assignee: assignee?.login ?? undefined,
    label: label?.name ?? undefined,
    stateReason: stateReason ?? undefined,
    reviewState: event === 'reviewed' ? state ?? undefined : undefined,
    requestedReviewer: requestedReviewer?.login ?? undefined,
    requestedTeam: requestedTeam?.slug ?? undefined,
    authorAssociation: authorAssociation ?? undefined,
    url: url ?? undefined,
    commitId: commitId ?? undefined,
    sha: sha ?? undefined,
    authorName: event === 'committed' ? author?.name ?? undefined : undefined,
    rename: toRename(rename),
    source: event === 'cross-referenced' ? toSource(source) : undefined,
  });
};

export const toTimelinePage = (
  { data, headers }: TimelineResponse,
  { page, eventTypes }: { page: number; eventTypes?: readonly string[] }
): TimelinePage => {
  const events = data.flatMap((raw) => {
    const event = normalizeTimelineEvent(raw);
    return event && (!eventTypes || eventTypes.includes(event.event)) ? [event] : [];
  });
  const hasMore = typeof headers.link === 'string' && headers.link.includes('rel="next"');
  return { events, page, nextPage: hasMore ? page + 1 : null, hasMore };
};
