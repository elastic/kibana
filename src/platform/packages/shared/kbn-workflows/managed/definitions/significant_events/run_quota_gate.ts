/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowTemplateValues } from '../../types';

/**
 * Template values are substituted into the static YAML files via exact-token
 * replacement, since values needed at workflow-install time (batch sizes, run
 * limits) cannot be expressed with the engine's own `${{ }}` / `{{ }}` runtime
 * templating.
 */
export const renderTemplate = (
  template: string,
  values: Record<string, string | number | boolean>
): string =>
  Object.entries(values).reduce(
    (yaml, [token, value]) => yaml.split(token).join(String(value)),
    template
  );

/**
 * Values the daily run-quota gate needs baked in at install time. The gate is a
 * short preamble in every counted workflow that stops automated runs once the
 * workflow's budget group has used its daily allowance; the significant_events
 * plugin reinstalls the counted workflows whenever these change.
 */
export interface SignificantEventsRunQuotaTemplateValues extends ManagedWorkflowTemplateValues {
  /** When false the gate never stops a run, whatever the count says. */
  runQuotaEnabled: boolean;
  /** Runs the budget group may admit per calendar day. */
  runDailyLimit: number;
  /** IANA time zone the `now/d` window is rounded in. */
  runQuotaTimeZone: string;
}

export const renderRunQuotaGate = (
  template: string,
  { runQuotaEnabled, runDailyLimit, runQuotaTimeZone }: SignificantEventsRunQuotaTemplateValues
): string =>
  renderTemplate(template, {
    __RUN_QUOTA_ENABLED__: runQuotaEnabled,
    __RUN_DAILY_LIMIT__: runDailyLimit,
    __RUN_QUOTA_TIME_ZONE__: runQuotaTimeZone,
  });
