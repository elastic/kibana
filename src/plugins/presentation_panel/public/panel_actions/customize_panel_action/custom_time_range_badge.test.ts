/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, TimeRange, type AggregateQuery, type Query } from '@kbn/es-query';

import { PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { CustomTimeRangeBadge } from './custom_time_range_badge';

const mockTimeRange: TimeRange = { from: 'now-17m', to: 'now' };

describe('custom time range badge action', () => {
  let action: CustomTimeRangeBadge;
  let context: { embeddable: PublishesUnifiedSearch };

  let updateTimeRange: (timeRange: TimeRange | undefined) => void;

  beforeEach(() => {
    const timeRangeSubject = new BehaviorSubject<TimeRange | undefined>(undefined);
    updateTimeRange = (timeRange) => timeRangeSubject.next(timeRange);

    action = new CustomTimeRangeBadge();
    context = {
      embeddable: {
        timeRange$: timeRangeSubject,
        filters$: new BehaviorSubject<Filter[] | undefined>(undefined),
        query$: new BehaviorSubject<Query | AggregateQuery | undefined>(undefined),
      },
    };
  });

  it('is compatible when api has a time range', async () => {
    updateTimeRange(mockTimeRange);
    expect(await action.isCompatible(context)).toBe(true);
  });

  it('is incompatible when api is missing required functions', async () => {
    const emptyContext = { embeddable: {} };
    expect(await action.isCompatible(emptyContext)).toBe(false);
  });

  it('calls onChange when time range changes', () => {
    const onChange = jest.fn();
    updateTimeRange(mockTimeRange);
    action.subscribeToCompatibilityChanges(context, onChange);
    updateTimeRange(undefined);
    expect(onChange).toHaveBeenCalledWith(false, action);
  });
});
