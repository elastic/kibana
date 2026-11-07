/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryProfileView } from './aggregate_esql_profile';
import { deriveInsights } from './profile_insights';

/** Stays below the limit the optimize route accepts for the profile context. */
const MAX_CONTEXT_LENGTH = 50_000;
const MAX_OPERATORS = 25;
const MAX_DRIVERS = 12;
const MAX_PLANS = 2;
const MAX_PLAN_LENGTH = 8_000;
const MAX_DETAIL_LENGTH = 300;

const millis = (nanos: number): string => `${(nanos / 1e6).toFixed(nanos >= 1e7 ? 0 : 2)} ms`;

const truncate = (text: string, length: number): string =>
  text.length > length ? `${text.slice(0, length)}…` : text;

/**
 * Describes a profile as plain text for a language model. It is built from the same summary the
 * view shows, so a change in the raw ES profile does not change what the model is told.
 */
export function buildProfileContext(view: QueryProfileView): string {
  const lines: string[] = [];

  if (view.queryTookMillis !== undefined) {
    lines.push(
      `The query took ${view.queryTookMillis} ms in total: planning ${
        view.planningTookMillis ?? 'unknown'
      } ms, execution ${view.executionTookMillis ?? 'unknown'} ms. It ran on ${
        view.driverCount
      } drivers.`
    );
  }

  const timed = view.operators.filter((operator) => operator.timeReported).slice(0, MAX_OPERATORS);
  if (timed.length > 0) {
    lines.push(
      '',
      'Operators by CPU time, summed over all drivers (CPU times do not add up to the total time):'
    );
    timed.forEach((operator) => {
      const detail = operator.detail ? ` ${truncate(operator.detail, MAX_DETAIL_LENGTH)}` : '';
      lines.push(
        `- ${operator.title}${detail}: ${millis(operator.processNanos)} (${Math.round(
          operator.share * 100
        )}%), ${operator.rowsReceived} rows in, ${operator.rowsEmitted} rows out`
      );
    });
  }

  const insights = deriveInsights(view);
  if (insights.length > 0) {
    lines.push('', 'Findings:');
    insights.forEach((insight) => lines.push(`- ${JSON.stringify(insight)}`));
  }

  const drivers = view.timeline.drivers.slice(0, MAX_DRIVERS);
  if (drivers.length > 0) {
    lines.push('', 'Drivers:');
    drivers.forEach((driver) => {
      const waited = driver.sleeps.reduce(
        (sum, sleep) => sum + (sleep.stopMillis - sleep.startMillis),
        0
      );
      lines.push(
        `- ${driver.label}: ran ${driver.stopMillis - driver.startMillis} ms, waited ${waited} ms`
      );
    });
  }

  view.plans.slice(0, MAX_PLANS).forEach((plan) => {
    if (plan.plan) {
      lines.push(
        '',
        `Physical plan (${plan.description ?? 'plan'}):`,
        truncate(plan.plan, MAX_PLAN_LENGTH)
      );
    }
  });

  return truncate(lines.join('\n'), MAX_CONTEXT_LENGTH);
}
