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

describe('esql notification action', () => {
  let esqlSubject: BehaviorSubject<AggregateQuery[]>;
  let api: EsqlNotificationActionApi;

  beforeEach(() => {
    esqlSubject = new BehaviorSubject<AggregateQuery[]>([]);
    api = {
      uuid: 'testId',
      esql$: esqlSubject,
      approximationApplied$: new BehaviorSubject<boolean | undefined>(undefined),
    };
  });

  it('is incompatible when api is missing required functions', async () => {
    expect(await esqlNotificationAction.isCompatible!({ embeddable: {} })).toBe(false);
  });

  it('is incompatible when esql$ is empty', async () => {
    expect(await esqlNotificationAction.isCompatible!({ embeddable: api })).toBe(false);
  });

  it('is compatible when esql$ has at least one query', async () => {
    esqlSubject.next([{ esql: 'FROM logs' }]);
    expect(await esqlNotificationAction.isCompatible!({ embeddable: api })).toBe(true);
  });

  it('couldBecomeCompatible returns true for a valid api', () => {
    expect(esqlNotificationAction.couldBecomeCompatible!({ embeddable: api })).toBe(true);
  });

  it('couldBecomeCompatible returns false for an incompatible api', () => {
    expect(esqlNotificationAction.couldBecomeCompatible!({ embeddable: {} })).toBe(false);
  });

  it('getCompatibilityChangesSubject emits when esql$ changes', (done) => {
    const subject = esqlNotificationAction.getCompatibilityChangesSubject!({ embeddable: api });
    subject?.pipe(take(1)).subscribe(() => done());
    esqlSubject.next([{ esql: 'FROM logs' }]);
  });

  it('getCompatibilityChangesSubject returns undefined for incompatible api', () => {
    expect(
      esqlNotificationAction.getCompatibilityChangesSubject!({ embeddable: {} })
    ).toBeUndefined();
  });
});
