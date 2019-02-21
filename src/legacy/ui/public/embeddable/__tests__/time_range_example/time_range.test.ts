/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { TIME_RANGE_ACTION_ID } from 'ui/embeddable/__tests__/time_range_example/action';
import { TimeRangeContainer } from 'ui/embeddable/__tests__/time_range_example/container';
import { ClockEmbeddable } from 'ui/embeddable/__tests__/time_range_example/embeddable';
import { actionRegistry } from 'ui/embeddable/actions';

let container: TimeRangeContainer;
const initialTimeRange = {
  to: 'now',
  from: 'now-15m',
};

function getTimeRangeObject(to: string, from: string) {
  return { to, from };
}

beforeEach(() => {
  container = new TimeRangeContainer(initialTimeRange);
});

test('embeddable displays correct time', () => {
  const embeddable1 = new ClockEmbeddable({
    id: '123',
    initialState: getTimeRangeObject('now', 'now-45m'),
  });
  const embeddable2 = new ClockEmbeddable({
    id: '456',
    initialState: getTimeRangeObject('now', 'now-60m'),
  });

  expect(embeddable1.getOutput()).toEqual(getTimeRangeObject('now', 'now-45m'));
  expect(embeddable2.getOutput()).toEqual(getTimeRangeObject('now', 'now-60m'));

  container.addEmbeddable(embeddable1);
  container.addEmbeddable(embeddable2);

  expect(embeddable1.getOutput()).toEqual(initialTimeRange);
  expect(embeddable2.getOutput()).toEqual(initialTimeRange);

  expect(container.getState().timeRange).toEqual(initialTimeRange);

  const modifiedTimeRange = getTimeRangeObject('now', 'now-30m');
  container.onStateChange({
    timeRange: modifiedTimeRange,
  });

  expect(embeddable1.getOutput()).toEqual(modifiedTimeRange);
  expect(embeddable2.getOutput()).toEqual(modifiedTimeRange);
  expect(container.getState().timeRange).toEqual(modifiedTimeRange);
});

test('when action is executed to modify embeddable, time is updated', () => {
  const embeddable1 = new ClockEmbeddable({
    id: '123',
    initialState: getTimeRangeObject('now', 'now-45m'),
  });
  const embeddable2 = new ClockEmbeddable({
    id: '456',
    initialState: getTimeRangeObject('now', 'now-60m'),
  });

  const timeRangeAction = actionRegistry.getActionById(TIME_RANGE_ACTION_ID);

  container.addEmbeddable(embeddable1);
  container.addEmbeddable(embeddable2);

  const timeRangeOverride = getTimeRangeObject('now-90m', 'now-555m');

  timeRangeAction.execute({
    embeddable: embeddable1,
    containerContext: container.getState(),
    actionContext: { inherit: false, timeRange: timeRangeOverride },
  });

  expect(container.getState().timeRange).toEqual(initialTimeRange);
  expect(embeddable1.getOutput()).toEqual(timeRangeOverride);
  expect(embeddable2.getOutput()).toEqual(initialTimeRange);

  const modifiedTimeRange = getTimeRangeObject('now+60m', 'now-30m');
  container.onStateChange({
    timeRange: modifiedTimeRange,
  });

  // Even when container state is updated, the one embeddable with the override continues to show the right
  // time.
  expect(embeddable1.getOutput()).toEqual(timeRangeOverride);
  expect(embeddable2.getOutput()).toEqual(modifiedTimeRange);

  timeRangeAction.execute({
    embeddable: embeddable1,
    containerContext: container.getState(),
    actionContext: { inherit: false, timeRange: initialTimeRange },
  });

  expect(embeddable1.getOutput()).toEqual(initialTimeRange);
});
