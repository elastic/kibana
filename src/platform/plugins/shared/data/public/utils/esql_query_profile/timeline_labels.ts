/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { PlanningPhaseId, TimelineOperator } from './types';
import type { DriverSpread } from './timeline_layout';
import { formatDurationMillis, formatShare } from './profile_format';

export const planningLabel = () =>
  i18n.translate('data.inspector.queryProfile.planningLaneLabel', { defaultMessage: 'Planning' });

/** Makes a name from the profile readable: `node_reduce` becomes "Node reduce". */
const humanize = (name: string): string => {
  const words = name.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** A name made of plain words, such as `data` or `node_reduce`, unlike `subplan-0.final`. */
const isPlainName = (name: string): boolean => /^[a-z]+(_[a-z]+)*$/.test(name);

/** The kinds of driver that the timeline groups by. Any other name is shown as Elasticsearch writes it. */
const DRIVER_KIND_LABELS: Record<string, () => string> = {
  data: () =>
    i18n.translate('data.inspector.queryProfile.dataDriversLabel', { defaultMessage: 'Data' }),
  node_reduce: () =>
    i18n.translate('data.inspector.queryProfile.nodeReduceDriversLabel', {
      defaultMessage: 'Node reduce',
    }),
  final: () =>
    i18n.translate('data.inspector.queryProfile.finalDriversLabel', { defaultMessage: 'Final' }),
};

/** What a group of drivers is called: its kind, or its description when that is not a plain kind. */
export const groupLabel = (description: string): string => {
  if (description === '') {
    return i18n.translate('data.inspector.queryProfile.otherDriversLabel', {
      defaultMessage: 'Other',
    });
  }
  if (Object.hasOwn(DRIVER_KIND_LABELS, description)) {
    return DRIVER_KIND_LABELS[description]();
  }
  return isPlainName(description) ? humanize(description) : description;
};

/** A planning phase is called by its name in the profile, such as `view_resolution`. */
export const planningPhaseLabel = (id: PlanningPhaseId): string => humanize(id);

export const operatorTimeLabel = (operator: TimelineOperator): string =>
  operator.timeReported ? formatDurationMillis(operator.processNanos / 1e6) : '–';

export const operatorShareLabel = (operator: TimelineOperator): string =>
  operator.timeReported ? formatShare(operator.share) : '–';

/** How many drivers a group has and how long they took, such as "4 drivers, 120 ms to 480 ms". */
export const spreadLabel = ({ count, minMillis, maxMillis }: DriverSpread): string =>
  i18n.translate('data.inspector.queryProfile.groupSpreadLabel', {
    defaultMessage: '{count, plural, one {# driver} other {# drivers}}, {min} to {max}',
    values: {
      count,
      min: formatDurationMillis(minMillis),
      max: formatDurationMillis(maxMillis),
    },
  });
