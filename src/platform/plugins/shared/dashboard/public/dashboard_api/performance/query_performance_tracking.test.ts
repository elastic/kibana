/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { PerformanceMetricEvent } from '@kbn/ebt-tools';
import { getMockPresentationContainer } from '@kbn/presentation-publishing/interfaces/containers/mocks';
import type {
  PhaseEvent,
  PhaseEventType,
  PresentationContainer,
} from '@kbn/presentation-publishing';
import { apiPublishesPhaseEvents } from '@kbn/presentation-publishing';
import { waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { PerformanceState } from './query_performance_tracking';
import { startQueryPerformanceTracking } from './query_performance_tracking';
import { DASHBOARD_DURATION_START_MARK } from './dashboard_duration_start_mark';

const mockMetricEvent = jest.fn();
jest.mock('@kbn/ebt-tools', () => ({
  ...jest.requireActual('@kbn/ebt-tools'),
  reportPerformanceMetricEvent: (_: CoreStart['analytics'], args: PerformanceMetricEvent) => {
    mockMetricEvent(args);
  },
}));

const mockDashboard = (
  children: {} = {}
): {
  dashboard: PresentationContainer;
  performanceState: PerformanceState;
  children$: BehaviorSubject<{ [key: string]: unknown }>;
} => {
  const children$ = new BehaviorSubject<{ [key: string]: unknown }>(children);
  return {
    dashboard: {
      ...getMockPresentationContainer(),
      children$,
      getPanelCount: () => Object.keys(children$.value).length,
    },
    performanceState: {
      firstLoad: true,
      creationStartTime: Date.now(),
    },
    children$,
  };
};

describe('startQueryPerformanceTracking', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    window.performance.clearMarks = jest.fn();
  });

  const setChildrenStatus = (children: {}, status: PhaseEventType) => {
    for (const child of Object.values(children)) {
      if (apiPublishesPhaseEvents(child)) {
        (child.phase$ as BehaviorSubject<PhaseEvent>).next({
          status,
          id: '',
          timeToEvent: 0,
        });
      }
    }
  };

  it('sets last load start time when loading begins', async () => {
    const children = {
      panel1: {
        phase$: new BehaviorSubject<PhaseEvent>({ status: 'loading', id: '', timeToEvent: 0 }),
      },
      panel2: {
        phase$: new BehaviorSubject<PhaseEvent>({ status: 'loading', id: '', timeToEvent: 0 }),
      },
    };
    const { dashboard, performanceState } = mockDashboard(children);
    startQueryPerformanceTracking(dashboard, performanceState);

    expect(performanceState.lastLoadStartTime).toBeDefined();
  });

  it('sets creation end time when no children are present', async () => {
    const { dashboard, performanceState } = mockDashboard();
    startQueryPerformanceTracking(dashboard, performanceState);
    expect(performanceState.creationEndTime).toBeDefined();
  });

  it('sets creation end time when all panels with phase event reporting have rendered', async () => {
    const children = {
      panel1: {
        phase$: new BehaviorSubject<PhaseEvent>({ status: 'loading', id: '', timeToEvent: 0 }),
      },
      panel2: {
        phase$: new BehaviorSubject<PhaseEvent>({ status: 'loading', id: '', timeToEvent: 0 }),
      },
    };
    const { dashboard, performanceState } = mockDashboard(children);
    startQueryPerformanceTracking(dashboard, performanceState);
    setChildrenStatus(children, 'rendered');
    await waitFor(() => {
      expect(performanceState.creationEndTime).toBeDefined();
    });
  });

  it('Reports a metric event when all panels with phase event reporting have rendered', async () => {
    const children = {
      panel1: {
        phase$: new BehaviorSubject<PhaseEvent>({ status: 'loading', id: '', timeToEvent: 0 }),
      },
      panel2: {
        phase$: new BehaviorSubject<PhaseEvent>({ status: 'loading', id: '', timeToEvent: 0 }),
      },
    };
    const { dashboard, performanceState } = mockDashboard(children);
    startQueryPerformanceTracking(dashboard, performanceState);

    expect(mockMetricEvent).not.toHaveBeenCalled();
    setChildrenStatus(children, 'rendered');

    expect(mockMetricEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'dashboard_loaded',
        key1: 'time_to_data',
        value1: expect.any(Number),
        key2: 'num_of_panels',
        value2: 2,
        key4: 'load_type',
        value4: 1, // dashboard first load
      })
    );
  });

  it('ignores panels that do not publish phase events', async () => {
    const children = {
      panel1: {
        phase$: new BehaviorSubject<PhaseEvent>({ status: 'loading', id: '', timeToEvent: 0 }),
      },
      panel2: {
        phase$: new BehaviorSubject<PhaseEvent>({ status: 'loading', id: '', timeToEvent: 0 }),
      },
      panel3: { wow: 'wow' },
      panel4: { wow: 'wow' },
    };
    const { dashboard, performanceState } = mockDashboard(children);
    startQueryPerformanceTracking(dashboard, performanceState);
    setChildrenStatus(children, 'rendered');

    expect(mockMetricEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'dashboard_loaded',
        key1: 'time_to_data',
        value1: expect.any(Number),
        key2: 'num_of_panels',
        value2: 4,
        key4: 'load_type',
        value4: 1, // dashboard first load
      })
    );
  });

  it('reports initial and subsequent loads', async () => {
    const children = {
      panel1: {
        phase$: new BehaviorSubject<PhaseEvent>({ status: 'loading', id: '', timeToEvent: 0 }),
      },
      panel2: {
        phase$: new BehaviorSubject<PhaseEvent>({ status: 'loading', id: '', timeToEvent: 0 }),
      },
      panel3: { wow: 'wow' },
      panel4: { wow: 'wow' },
    };
    const { dashboard, performanceState } = mockDashboard(children);
    startQueryPerformanceTracking(dashboard, performanceState);
    setChildrenStatus(children, 'rendered');

    await waitFor(() => {
      expect(mockMetricEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          value4: 1, // dashboard first load
        })
      );
    });

    expect(window.performance.clearMarks).toHaveBeenCalledTimes(1);
    expect(window.performance.clearMarks).toHaveBeenLastCalledWith(DASHBOARD_DURATION_START_MARK);

    setChildrenStatus(children, 'loading');
    await new Promise((r) => setTimeout(r, 1));
    setChildrenStatus(children, 'rendered');

    expect(mockMetricEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        value4: 2, // dashboard subsequent load
      })
    );

    expect(window.performance.clearMarks).toHaveBeenCalledTimes(2);
    expect(window.performance.clearMarks).toHaveBeenLastCalledWith(DASHBOARD_DURATION_START_MARK);
  });

  it('subscribes to newly added panels', async () => {
    const children: { [key: string]: unknown } = {
      panel1: {
        phase$: new BehaviorSubject<PhaseEvent>({ status: 'loading', id: '', timeToEvent: 0 }),
      },
    };
    const { dashboard, performanceState, children$ } = mockDashboard(children);
    startQueryPerformanceTracking(dashboard, performanceState);
    setChildrenStatus(children, 'rendered');
    expect(mockMetricEvent).toHaveBeenCalledTimes(1);

    // add a new panel
    children.panel2 = {
      phase$: new BehaviorSubject<PhaseEvent>({ status: 'loading', id: '', timeToEvent: 0 }),
    };
    children$.next(children);
    setChildrenStatus(children, 'rendered');

    expect(mockMetricEvent).toHaveBeenCalledTimes(2);
    expect(mockMetricEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        key2: 'num_of_panels',
        value2: 2,
        key4: 'load_type',
        value4: 2, // dashboard subsequent load
      })
    );
  });

  it('ensures the duration is at least as long as the time to data', async () => {
    // start an empty Dashboard. This will set the creation end time to some short value
    const { dashboard, children$, performanceState } = mockDashboard();
    startQueryPerformanceTracking(dashboard, performanceState);
    expect(performanceState.creationEndTime).toBeDefined();

    // add a panel that takes a long time to load
    const children = {
      panel1: {
        phase$: new BehaviorSubject<PhaseEvent>({ status: 'loading', id: '', timeToEvent: 0 }),
      },
    };
    children$.next(children);
    await new Promise((r) => setTimeout(r, 10));
    setChildrenStatus(children, 'rendered');

    expect(mockMetricEvent.mock.calls[0][0].duration).toBeGreaterThanOrEqual(
      mockMetricEvent.mock.calls[0][0].value1
    );
  });
});
