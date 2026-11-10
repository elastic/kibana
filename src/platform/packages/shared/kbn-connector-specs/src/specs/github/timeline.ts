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

const RawUserSchema = lazySchema(() => z.looseObject({ login: z.string().nullish() }));

const RawGitIdentitySchema = lazySchema(() =>
  z.looseObject({ name: z.string().nullish(), date: z.string().nullish() })
);

const RawTimelineEventSchema = lazySchema(() =>
  z.looseObject({
    id: z.number().nullish(),
    event: z.string(),
    created_at: z.string().nullish(),
    submitted_at: z.string().nullish(),
    actor: RawUserSchema.nullish(),
    user: RawUserSchema.nullish(),
    label: z.looseObject({ name: z.string().nullish() }).nullish(),
    state_reason: z.string().nullish(),
    state: z.string().nullish(),
    author_association: z.string().nullish(),
    html_url: z.string().nullish(),
    commit_id: z.string().nullish(),
    sha: z.string().nullish(),
    author: RawGitIdentitySchema.nullish(),
    committer: RawGitIdentitySchema.nullish(),
    requested_reviewer: RawUserSchema.nullish(),
    requested_team: z.looseObject({ slug: z.string().nullish() }).nullish(),
    rename: z.looseObject({ from: z.string().nullish(), to: z.string().nullish() }).nullish(),
    source: z
      .looseObject({
        issue: z
          .looseObject({
            number: z.number().nullish(),
            html_url: z.string().nullish(),
            repository: z.looseObject({ full_name: z.string().nullish() }).nullish(),
            pull_request: z.looseObject({}).nullish(),
          })
          .nullish(),
      })
      .nullish(),
  })
);

type RawTimelineEvent = z.infer<typeof RawTimelineEventSchema>;

export interface TimelineEvent {
  event: string;
  id?: number;
  createdAt?: string;
  actor?: string;
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
