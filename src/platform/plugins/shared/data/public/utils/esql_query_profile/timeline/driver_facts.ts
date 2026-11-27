/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { formatDurationMillis } from '../shared/profile_format';
import { spanMillis } from '../shared/time_span';
import type { TimelineDriver, TimeSpan } from '../profile/types';

/** One thing to tell about a lane, such as when it started. */
export interface Fact {
  id: string;
  label: string;
  value: string;
}

/** When a span started, counted from the start of the timeline, and how long it lasted. */
export const timingFacts = (span: TimeSpan, origin: number): Fact[] => [
  {
    id: 'start',
    label: i18n.translate('data.inspector.queryProfile.driverStartLabel', {
      defaultMessage: 'Starts at',
    }),
    value: `+${formatDurationMillis(Math.max(span.startMillis - origin, 0))}`,
  },
  {
    id: 'duration',
    label: i18n.translate('data.inspector.queryProfile.driverDurationLabel', {
      defaultMessage: 'Duration',
    }),
    value: formatDurationMillis(spanMillis(span)),
  },
];

/** The timing of a driver, its CPU time, and how long it waited and why. */
export const driverFacts = (driver: TimelineDriver, origin: number): Fact[] => {
  const reasons = [...new Set(driver.sleeps.map((sleep) => sleep.reason).filter(Boolean))];
  const waited = formatDurationMillis(driver.waitedMillis);

  return [
    ...timingFacts(driver, origin),
    ...(driver.cpuNanos === undefined
      ? []
      : [
          {
            id: 'cpu',
            label: i18n.translate('data.inspector.queryProfile.driverCpuLabel', {
              defaultMessage: 'CPU',
            }),
            value: formatDurationMillis(driver.cpuNanos / 1e6),
          },
        ]),
    ...(driver.sleepCount === 0
      ? []
      : [
          {
            id: 'waited',
            label: i18n.translate('data.inspector.queryProfile.driverWaitedLabel', {
              defaultMessage: '{isLowerBound, select, true {Waited at least} other {Waited}}',
              // ES records only some of the waits, so what is known can be too low.
              values: { isLowerBound: driver.sleepCount > driver.sleeps.length },
            }),
            value: reasons.length > 0 ? `${waited} (${reasons.join(', ')})` : waited,
          },
        ]),
  ];
};
