/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, of, throwError } from 'rxjs';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import type { Request } from '@kbn/inspector-plugin/common';
import { RequestStatus } from '@kbn/inspector-plugin/common';
import {
  createReplayKey,
  getReplayKind,
  type ReplayKind,
} from '../../../common/search/create_replay_key';

export interface ReplayOptions {
  /** Send requests that are not in the snapshot to the live cluster instead of failing them. */
  passthrough?: boolean;
}

interface ReplayEntry {
  replayKey?: string;
  /** ES|QL query text: separates e.g. the Discover table from the histogram query */
  esqlQuery?: string;
  kind: ReplayKind;
  response: IKibanaSearchResponse;
  used: boolean;
}

interface Activation {
  entries: ReplayEntry[];
  passthrough: boolean;
  sessionIds: Set<string>;
}

/** A replay of recorded responses, limited to the search sessions added to it. */
export interface ReplaySession {
  /** Replays the searches of this search session, e.g. each fetch of the replaying Discover tab. */
  addSessionId: (sessionId: string) => void;
  dispose: () => void;
}

export const NOT_IN_SNAPSHOT_ERROR = 'NotInSnapshotError';

const createNotInSnapshotError = () =>
  Object.assign(
    new Error('Not in snapshot: this request was not recorded in the imported Inspector snapshot.'),
    { name: NOT_IN_SNAPSHOT_ERROR }
  );

const getEsqlQuery = (params: object | undefined): string | undefined => {
  const { query } = (params ?? {}) as { query?: unknown };
  return typeof query === 'string' ? query : undefined;
};

const toEntries = (requests: Request[]): ReplayEntry[] =>
  [...requests]
    .filter(({ status, response }) => status === RequestStatus.OK && response?.json)
    .sort((a, b) => a.startTime - b.startTime)
    .map(({ replayKey, json, response }) => ({
      replayKey,
      esqlQuery: getEsqlQuery(json),
      kind: getReplayKind(json),
      response: response!.json as IKibanaSearchResponse,
      used: false,
    }));

/**
 * Serves recorded Inspector responses instead of sending searches to Elasticsearch.
 * Only searches of the search sessions added to an activation are replayed; all others go live.
 * Matches by exact replay key, then by ES|QL query text, then by request kind in order of arrival.
 * Each entry is used once.
 */
export class ReplayRegistry {
  private readonly activations = new Set<Activation>();
  public readonly isActive$ = new BehaviorSubject(false);

  public activate(requests: Request[], { passthrough = false }: ReplayOptions = {}): ReplaySession {
    const activation: Activation = {
      entries: toEntries(requests),
      passthrough,
      sessionIds: new Set(),
    };
    this.activations.add(activation);
    this.isActive$.next(true);
    return {
      addSessionId: (sessionId) => {
        if (this.activations.has(activation)) {
          activation.sessionIds.add(sessionId);
        }
      },
      dispose: () => {
        this.activations.delete(activation);
        this.isActive$.next(this.activations.size > 0);
      },
    };
  }

  public isActive(): boolean {
    return this.activations.size > 0;
  }

  /** Returns the replayed response, an error, or undefined when the request should go live. */
  public match(
    request: IKibanaSearchRequest,
    sessionId?: string
  ): Observable<IKibanaSearchResponse> | undefined {
    const activation = sessionId
      ? [...this.activations].find(({ sessionIds }) => sessionIds.has(sessionId))
      : undefined;
    if (!activation) {
      return undefined;
    }
    const { entries, passthrough } = activation;
    const replayKey = createReplayKey(request.params);
    const esqlQuery = getEsqlQuery(request.params);
    const kind = getReplayKind(request.params);
    const entry =
      entries.find((e) => !e.used && e.replayKey === replayKey) ??
      entries.find((e) => !e.used && esqlQuery !== undefined && e.esqlQuery === esqlQuery) ??
      entries.find((e) => !e.used && e.kind === kind);

    if (entry) {
      entry.used = true;
      return of({ ...entry.response, isRunning: false, isPartial: false });
    }
    return passthrough ? undefined : throwError(createNotInSnapshotError);
  }
}

export type IReplayRegistry = Pick<ReplayRegistry, 'activate' | 'isActive' | 'isActive$'>;
