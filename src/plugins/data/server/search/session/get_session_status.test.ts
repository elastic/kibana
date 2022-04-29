/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchStatus } from './types';
import { getSessionStatus } from './get_session_status';
import { SearchSessionStatus } from '../../../common';
import moment from 'moment';
import { SearchSessionsConfigSchema } from '../../../config';

describe('getSessionStatus', () => {
  const mockConfig = {
    notTouchedInProgressTimeout: moment.duration(1, 'm'),
  } as unknown as SearchSessionsConfigSchema;
  test("returns an in_progress status if there's nothing inside the session", () => {
    const session: any = {
      idMapping: {},
      touched: moment(),
    };
    expect(getSessionStatus(session, mockConfig)).toBe(SearchSessionStatus.IN_PROGRESS);
  });

  test("returns an error status if there's at least one error", () => {
    const session: any = {
      idMapping: {
        a: { status: SearchStatus.IN_PROGRESS },
        b: { status: SearchStatus.ERROR, error: 'Nope' },
        c: { status: SearchStatus.COMPLETE },
      },
    };
    expect(getSessionStatus(session, mockConfig)).toBe(SearchSessionStatus.ERROR);
  });

  test('expires a empty session after a minute', () => {
    const session: any = {
      idMapping: {},
      touched: moment().subtract(2, 'm'),
    };
    expect(getSessionStatus(session, mockConfig)).toBe(SearchSessionStatus.EXPIRED);
  });

  test('doesnt expire a full session after a minute', () => {
    const session: any = {
      idMapping: {
        a: { status: SearchStatus.IN_PROGRESS },
      },
      touched: moment().subtract(2, 'm'),
    };
    expect(getSessionStatus(session, mockConfig)).toBe(SearchSessionStatus.IN_PROGRESS);
  });

  test('returns a complete status if all are complete', () => {
    const session: any = {
      idMapping: {
        a: { status: SearchStatus.COMPLETE },
        b: { status: SearchStatus.COMPLETE },
        c: { status: SearchStatus.COMPLETE },
      },
    };
    expect(getSessionStatus(session, mockConfig)).toBe(SearchSessionStatus.COMPLETE);
  });

  test('returns a running status if some are still running', () => {
    const session: any = {
      idMapping: {
        a: { status: SearchStatus.IN_PROGRESS },
        b: { status: SearchStatus.COMPLETE },
        c: { status: SearchStatus.IN_PROGRESS },
      },
    };
    expect(getSessionStatus(session, mockConfig)).toBe(SearchSessionStatus.IN_PROGRESS);
  });
});
