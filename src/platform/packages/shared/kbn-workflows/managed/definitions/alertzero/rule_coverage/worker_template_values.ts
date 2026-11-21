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
} from '../worker_template_values';

export interface RuleCoverageWorkerTemplateValues extends ScheduledWorkerTemplateValues {
  extras: {
    lookbackDays: number;
    maxGapsPerRun: number;
  };
}

export const renderRuleCoverageWorkerYaml = (
  yaml: string,
  values: RuleCoverageWorkerTemplateValues
): string =>
  renderScheduledWorkerYaml(yaml, values).replaceAll(
    '__WORKER_EXTRAS__',
    JSON.stringify(values.extras)
  );
