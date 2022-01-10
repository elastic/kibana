/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceStatus } from '../../../../types/status';
import { getLevelSortValue, groupByLevel, getHighestStatus } from './status_level';
import { FormattedStatus, StatusState } from './load_status';

type CreateStatusInput = Partial<Omit<FormattedStatus, 'state' | 'original'>> & {
  state?: Partial<StatusState>;
};

const dummyStatus: ServiceStatus = {
  level: 'available',
  summary: 'not used in this logic',
};

const createFormattedStatus = (parts: CreateStatusInput = {}): FormattedStatus => ({
  original: dummyStatus,
  id: 'id',
  ...parts,
  state: {
    id: 'available',
    title: 'Green',
    message: 'alright',
    uiColor: 'primary',
    ...parts.state,
  },
});

describe('getLevelSortValue', () => {
  it('returns the correct value for `critical` state', () => {
    expect(getLevelSortValue(createFormattedStatus({ state: { id: 'critical' } }))).toEqual(0);
  });

  it('returns the correct value for `unavailable` state', () => {
    expect(getLevelSortValue(createFormattedStatus({ state: { id: 'unavailable' } }))).toEqual(1);
  });

  it('returns the correct value for `degraded` state', () => {
    expect(getLevelSortValue(createFormattedStatus({ state: { id: 'degraded' } }))).toEqual(2);
  });

  it('returns the correct value for `available` state', () => {
    expect(getLevelSortValue(createFormattedStatus({ state: { id: 'available' } }))).toEqual(3);
  });
});

describe('groupByLevel', () => {
  it('groups statuses by their level', () => {
    const result = groupByLevel([
      createFormattedStatus({
        id: 'available-1',
        state: { id: 'available', title: 'green', uiColor: '#00FF00' },
      }),
      createFormattedStatus({
        id: 'critical-1',
        state: { id: 'critical', title: 'red', uiColor: '#FF0000' },
      }),
      createFormattedStatus({
        id: 'degraded-1',
        state: { id: 'degraded', title: 'yellow', uiColor: '#FFFF00' },
      }),
      createFormattedStatus({
        id: 'critical-2',
        state: { id: 'critical', title: 'red', uiColor: '#FF0000' },
      }),
    ]);

    expect(result.size).toEqual(3);
    expect(result.get('available')!.map((e) => e.id)).toEqual(['available-1']);
    expect(result.get('degraded')!.map((e) => e.id)).toEqual(['degraded-1']);
    expect(result.get('critical')!.map((e) => e.id)).toEqual(['critical-1', 'critical-2']);
  });

  it('returns an empty map when input list is empty', () => {
    const result = groupByLevel([]);
    expect(result.size).toEqual(0);
  });
});

describe('getHighestStatus', () => {
  it('returns the values from the highest status', () => {
    expect(
      getHighestStatus([
        createFormattedStatus({ state: { id: 'available', title: 'green', uiColor: '#00FF00' } }),
        createFormattedStatus({ state: { id: 'critical', title: 'red', uiColor: '#FF0000' } }),
        createFormattedStatus({ state: { id: 'degraded', title: 'yellow', uiColor: '#FFFF00' } }),
      ])
    ).toEqual({
      id: 'critical',
      title: 'red',
      uiColor: '#FF0000',
    });
  });

  it('handles multiple statuses with the same level', () => {
    expect(
      getHighestStatus([
        createFormattedStatus({ state: { id: 'degraded', title: 'yellow', uiColor: '#FF0000' } }),
        createFormattedStatus({ state: { id: 'available', title: 'green', uiColor: '#00FF00' } }),
        createFormattedStatus({ state: { id: 'degraded', title: 'yellow', uiColor: '#FFFF00' } }),
      ])
    ).toEqual({
      id: 'degraded',
      title: 'yellow',
      uiColor: '#FF0000',
    });
  });

  it('returns the default values for `available` when the input list is empty', () => {
    expect(getHighestStatus([])).toEqual({
      id: 'available',
      title: 'Green',
      uiColor: 'success',
    });
  });
});
