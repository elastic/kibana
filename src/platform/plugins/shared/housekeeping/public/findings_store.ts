/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, type Observable } from 'rxjs';
import type { HttpStart } from '@kbn/core/public';
import type { HousekeepingFindingsResponse, HousekeepingScope } from '../common';
import { HOUSEKEEPING_FINDINGS_API_PATH } from '../common';

export const FINDINGS_CACHE_TTL_MS = 10 * 60 * 1000;

export interface FindingsState {
  isLoading: boolean;
  response?: HousekeepingFindingsResponse;
  loadedAt?: number;
  error?: string;
}

/** Identifies a scope, whatever the order of its resource types. */
export const toKey = ({ resourceTypes = [], resourceId }: HousekeepingScope = {}) =>
  JSON.stringify([[...resourceTypes].sort(), resourceId ?? null]);

/**
 * Keeps the last run of each scope for the browser session, so reopening the flyout doesn't
 * rerun the checks. A scoped run only asks the server for what the scope needs.
 */
export class FindingsStore {
  private readonly states = new Map<string, BehaviorSubject<FindingsState>>();

  constructor(private readonly http: HttpStart) {}

  private getSubject(scope?: HousekeepingScope) {
    const key = toKey(scope);
    let subject = this.states.get(key);
    if (!subject) {
      subject = new BehaviorSubject<FindingsState>({ isLoading: false });
      this.states.set(key, subject);
    }
    return subject;
  }

  /** The same observable for every call with the same scope, so hooks don't subscribe again. */
  getState$(scope?: HousekeepingScope): Observable<FindingsState> {
    return this.getSubject(scope);
  }

  getState(scope?: HousekeepingScope) {
    return this.getSubject(scope).getValue();
  }

  async load(scope?: HousekeepingScope, { force = false }: { force?: boolean } = {}) {
    const subject = this.getSubject(scope);
    const { isLoading, response, loadedAt } = subject.getValue();
    if (isLoading) {
      return;
    }
    if (!force && response && loadedAt && Date.now() - loadedAt < FINDINGS_CACHE_TTL_MS) {
      return;
    }

    subject.next({ ...subject.getValue(), isLoading: true, error: undefined });
    try {
      const findings = await this.http.get<HousekeepingFindingsResponse>(
        HOUSEKEEPING_FINDINGS_API_PATH,
        { query: { resourceType: scope?.resourceTypes, resourceId: scope?.resourceId } }
      );
      subject.next({ isLoading: false, response: findings, loadedAt: Date.now() });
    } catch (error) {
      subject.next({
        ...subject.getValue(),
        isLoading: false,
        error: error.body?.message ?? error.message,
      });
    }
  }
}
