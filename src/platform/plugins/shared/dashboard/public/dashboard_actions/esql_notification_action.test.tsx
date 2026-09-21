/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, take } from 'rxjs';
import type { AggregateQuery } from '@kbn/es-query';
import type { EsqlNotificationActionApi } from './esql_notification_action';
import { esqlNotificationAction } from './esql_notification_action';

const makeApi = (queries: AggregateQuery[] = []): EsqlNotificationActionApi => ({
  uuid: 'testId',
  esql$: new BehaviorSubject<AggregateQuery[]>(queries),
  approximationApplied$: new BehaviorSubject<boolean | undefined>(undefined),
});

describe('esql notification action', () => {
  it('is incompatible when api is missing required functions', async () => {
    expect(await esqlNotificationAction.isCompatible!({ embeddable: {} })).toBe(false);
  });

  it('is incompatible when esql$ is empty', async () => {
    expect(await esqlNotificationAction.isCompatible!({ embeddable: makeApi([]) })).toBe(false);
  });

  it('is compatible when esql$ has at least one query', async () => {
    expect(
      await esqlNotificationAction.isCompatible!({
        embeddable: makeApi([{ esql: 'FROM logs' }]),
      })
    ).toBe(true);
  });

  it('couldBecomeCompatible returns true for a valid api', () => {
    expect(esqlNotificationAction.couldBecomeCompatible!({ embeddable: makeApi() })).toBe(true);
  });

  it('couldBecomeCompatible returns false for an incompatible api', () => {
    expect(esqlNotificationAction.couldBecomeCompatible!({ embeddable: {} })).toBe(false);
  });

  it('getCompatibilityChangesSubject emits when esql$ changes', (done) => {
    const api = makeApi([]);
    const subject = esqlNotificationAction.getCompatibilityChangesSubject!({ embeddable: api });
    subject?.pipe(take(1)).subscribe(() => done());
    api.esql$.next([{ esql: 'FROM logs' }]);
  });

  it('getCompatibilityChangesSubject returns undefined for incompatible api', () => {
    expect(
      esqlNotificationAction.getCompatibilityChangesSubject!({ embeddable: {} })
    ).toBeUndefined();
  });
});
