/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { diffLines } from 'diff';
import equal from 'fast-deep-equal';
import type { ObjectChange } from '@kbn/change-history';
import type { RequestHandlerContext, SavedObject } from '@kbn/core/server';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import {
  DISCOVER_SESSION_CHANGE_HISTORY_OBJECT_TYPE,
  DISCOVER_SESSION_DELETE_ACTION,
} from '../../common/constants';
import type { DiscoverSessionInternalData } from '../api/internal_schema';
import { transformInternalDiscoverSessionOut } from '../api/transforms/transform_discover_session_out';
import { getChangeHistoryClient, getChangeHistoryLogger } from './change_history_service';

export const INITIAL_HISTORY_SEQUENCE = 1;
const DEFAULT_SPACE_ID = 'default';
// Max edit length (added + removed lines) before the line diff gives up
const MAX_DIFF_EDIT_LENGTH = 1000;

type StoredSession = Pick<
  SavedObject<DiscoverSessionAttributes>,
  'id' | 'attributes' | 'references' | 'namespaces'
>;

export type DiscoverSessionChangeType = 'create' | 'update' | 'delete';

const toDiffText = (value: object): string => JSON.stringify(value, null, 2);

/**
 * Number of changed line blocks between two pretty-printed JSON snapshots, matching the history
 * diff navigator. Undefined if the line diff is too expensive to compute.
 */
export const countChangedLineBlocks = (previous: object, current: object): number | undefined => {
  const changes = diffLines(toDiffText(previous), toDiffText(current), {
    maxEditLength: MAX_DIFF_EDIT_LENGTH,
  });
  if (!changes) return undefined;

  let blocks = 0;
  let inChangedBlock = false;
  for (const { added, removed } of changes) {
    const isChanged = Boolean(added || removed);
    if (isChanged && !inChangedBlock) blocks++;
    inChangedBlock = isChanged;
  }
  return blocks;
};

/** Saved searches are isolated to one space, which is reported by the saved object itself. */
export const getSessionSpaceId = (session: Pick<StoredSession, 'namespaces'>): string =>
  session.namespaces?.[0] ?? DEFAULT_SPACE_ID;

/** Whether the stored content (attributes or references) differs between two session versions. */
export const hasContentChanged = (
  existing: Pick<StoredSession, 'attributes' | 'references'>,
  next: Pick<StoredSession, 'attributes' | 'references'>
): boolean =>
  !equal(existing.attributes, next.attributes) || !equal(existing.references, next.references);

/**
 * Builds the as-code snapshot recorded in history. Returns undefined if the session cannot be
 * converted, since history is best-effort.
 */
export const getHistorySnapshot = (
  session: Pick<StoredSession, 'id' | 'attributes' | 'references'>
): DiscoverSessionInternalData | undefined => {
  try {
    return transformInternalDiscoverSessionOut(session.attributes, session.references).sessionState;
  } catch (error) {
    getChangeHistoryLogger()?.warn(
      `Unable to build change history snapshot for Discover session ${session.id}: ${error.message}`
    );
    return undefined;
  }
};

/**
 * Latest sequence of the session's history. History outlives the saved object, so a session
 * recreated with the same ID continues from where the deleted one stopped.
 */
export const getLatestHistorySequence = async (
  spaceId: string,
  sessionId: string
): Promise<number | undefined> => {
  try {
    const client = await getChangeHistoryClient();
    const {
      items: [latestItem],
    } = await client.getHistory(spaceId, DISCOVER_SESSION_CHANGE_HISTORY_OBJECT_TYPE, sessionId, {
      size: 1,
    });
    const sequence = latestItem?.object.sequence;
    return typeof sequence === 'number' ? sequence : undefined;
  } catch (error) {
    getChangeHistoryLogger()?.warn(
      `Unable to read change history sequence for Discover session ${sessionId}: ${error.message}`
    );
    return undefined;
  }
};

interface RecordSessionChangeParams {
  requestContext: RequestHandlerContext;
  type: DiscoverSessionChangeType;
  session: StoredSession;
  /** Pre-change state, used to count changes. Omitted on create. */
  previousSession?: StoredSession;
  /** The version restored by this change, if any. */
  restoredFrom?: number;
}

/** Records a session change in history. Best-effort: a failed write never fails the save. */
export const recordSessionChange = async ({
  requestContext,
  type,
  session,
  previousSession,
  restoredFrom,
}: RecordSessionChangeParams): Promise<void> => {
  try {
    if (type === 'update' && previousSession && !hasContentChanged(previousSession, session)) {
      return;
    }

    const snapshot = getHistorySnapshot(session);
    if (!snapshot) return;

    const client = await getChangeHistoryClient();
    const { core } = await requestContext.resolve(['core']);
    const user = core.security.authc.getCurrentUser();
    const spaceId = getSessionSpaceId(session);
    const latestSequence = await getLatestHistorySequence(spaceId, session.id);
    const previousSnapshot = previousSession ? getHistorySnapshot(previousSession) : undefined;
    const changeCount = previousSnapshot
      ? countChangedLineBlocks(previousSnapshot, snapshot)
      : undefined;

    const change: ObjectChange = {
      objectType: DISCOVER_SESSION_CHANGE_HISTORY_OBJECT_TYPE,
      objectId: session.id,
      sequence: latestSequence === undefined ? INITIAL_HISTORY_SEQUENCE : latestSequence + 1,
      timestamp: new Date().toISOString(),
      snapshot, // post-change state
    };

    await client.log(change, {
      action: `discover_session_${type}`,
      username: user?.username ?? '',
      userProfileId: user?.profile_uid,
      spaceId,
      data: {
        metadata: {
          ...(changeCount !== undefined && { changeCount }),
          ...(typeof restoredFrom === 'number' && { restoredFrom }),
        },
      },
      // sequences are derived from the latest event, so it has to be searchable before the next write
      refresh: 'wait_for',
    });
  } catch (error) {
    getChangeHistoryLogger()?.warn(
      `Unable to record change history for Discover session ${session.id}: ${error.message}`
    );
  }
};

export const isDeleteAction = (action: string): boolean =>
  action === DISCOVER_SESSION_DELETE_ACTION;
