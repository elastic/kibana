/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  renderScheduledWorkerYaml,
  type ScheduledWorkerTemplateValues,
  scheduleIntervalToMinutes,
} from '../worker_template_values';

export interface AlertTriageWorkerTemplateValues extends ScheduledWorkerTemplateValues {
  extras: {
    autoCloseConfidenceScoreMinThreshold: number;
    budgetPerHour: number;
    lookbackHours: number;
    minSeverity: 'low' | 'medium' | 'high' | 'critical';
    excludeBuildingBlocks: boolean;
    excludedRuleTags: readonly string[];
  };
}

export const renderAlertTriageWorkerYaml = (
  yaml: string,
  values: AlertTriageWorkerTemplateValues
): string =>
  renderScheduledWorkerYaml(yaml, values)
    // JSON is a YAML flow mapping, so the whole object lands under consts in one substitution. A
    // function replacement keeps `$` sequences in free-form rule tags (`$$`, `$&`, `$'`) literal.
    .replaceAll('__WORKER_EXTRAS__', () => JSON.stringify(values.extras))
    .replaceAll(
      '__WORKER_SCHEDULE_INTERVAL_MINUTES__',
      String(scheduleIntervalToMinutes(values.scheduleInterval))
    );
