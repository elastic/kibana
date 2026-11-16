/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Moment } from 'moment';
import dateMath from '@kbn/datemath';
import type { AggregateQuery, EsQueryConfig, Filter, Query, TimeRange } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type {
  EnumValue,
  ScalarInputKind,
  WorkflowInputDescriptor,
} from './describe_workflow_inputs';
import type {
  WorkflowRunConstantValue,
  WorkflowRunInputMapping,
} from '../../../../server/dashboard_run_panel/schema';

export type ControlValue = string | number;

/** The current selection of one dashboard control. */
export interface DashboardControlSnapshot {
  id: string;
  label: string;
  /** Selected options, or `[min, max]` for a range slider (an open end is an empty string). */
  values: ControlValue[];
  isRange: boolean;
  /** `exclude` and `exists` selections filter the data but are not values an input can take. */
  mode: 'include' | 'exclude' | 'exists';
}

/** The dashboard state a panel run reads from, captured when the viewer clicks Run. */
export interface DashboardRunContext {
  timeRange?: TimeRange;
  query?: Query | AggregateQuery;
  filters: Filter[];
  controls: DashboardControlSnapshot[];
}

export interface ResolveWorkflowInputsOptions {
  now: Date;
  esQueryConfig?: EsQueryConfig;
}

export interface InputResolutionIssue {
  input: string;
  message: string;
}

export interface ResolvedWorkflowInputs {
  /** Values for the mapped inputs that resolved. Unmapped and unresolved inputs are absent. */
  values: Record<string, unknown>;
  issues: InputResolutionIssue[];
}

type Coerced = { ok: true; value: unknown } | { ok: false; message: string };

const invalid = (message: string): Coerced => ({ ok: false, message });

const coerceScalar = (
  value: ControlValue | boolean,
  kind: ScalarInputKind | 'unknown',
  enumValues: EnumValue[] | undefined
): Coerced => {
  switch (kind) {
    case 'string':
    case 'date':
    case 'date_time':
      return { ok: true, value: String(value) };
    case 'number':
    case 'integer': {
      const number = typeof value === 'number' ? value : Number(value);
      if (
        value === '' ||
        Number.isNaN(number) ||
        (kind === 'integer' && !Number.isInteger(number))
      ) {
        return invalid(
          i18n.translate('workflows.dashboardRunPanel.resolve.notANumber', {
            defaultMessage:
              '"{value}" is not {kind, select, integer {an integer} other {a number}}',
            values: { value: String(value), kind },
          })
        );
      }
      return { ok: true, value: number };
    }
    case 'boolean':
      if (value === true || value === 'true') return { ok: true, value: true };
      if (value === false || value === 'false') return { ok: true, value: false };
      return invalid(
        i18n.translate('workflows.dashboardRunPanel.resolve.notABoolean', {
          defaultMessage: '"{value}" is not true or false',
          values: { value: String(value) },
        })
      );
    case 'enum': {
      const match = enumValues?.find((option) => String(option) === String(value));
      return match === undefined
        ? invalid(
            i18n.translate('workflows.dashboardRunPanel.resolve.notAnOption', {
              defaultMessage: '"{value}" is not one of the allowed values',
              values: { value: String(value) },
            })
          )
        : { ok: true, value: match };
    }
    default:
      return { ok: true, value };
  }
};

const coerceValues = (
  values: ReadonlyArray<ControlValue | boolean>,
  descriptor: WorkflowInputDescriptor
): Coerced => {
  if (descriptor.kind === 'array') {
    const items: unknown[] = [];
    for (const value of values) {
      const item = coerceScalar(value, descriptor.itemKind ?? 'unknown', descriptor.itemEnumValues);
      if (!item.ok) return item;
      items.push(item.value);
    }
    return { ok: true, value: items };
  }
  if (
    descriptor.kind === 'object' ||
    descriptor.kind === 'time_range' ||
    descriptor.kind === 'query'
  ) {
    return invalid(
      i18n.translate('workflows.dashboardRunPanel.resolve.wrongSourceForObject', {
        defaultMessage: 'This input takes an object, which this source cannot provide',
      })
    );
  }
  if (values.length > 1) {
    return invalid(
      i18n.translate('workflows.dashboardRunPanel.resolve.tooManyValues', {
        defaultMessage: '{count} values are selected, but this input takes one',
        values: { count: values.length },
      })
    );
  }
  return coerceScalar(values[0], descriptor.kind, descriptor.enumValues);
};

const resolveControl = (
  controlId: string,
  descriptor: WorkflowInputDescriptor,
  controls: DashboardControlSnapshot[]
): Coerced | undefined => {
  const control = controls.find(({ id }) => id === controlId);
  if (!control) {
    return invalid(
      i18n.translate('workflows.dashboardRunPanel.resolve.controlMissing', {
        defaultMessage: 'The control this input reads from is no longer on the dashboard',
      })
    );
  }
  const values =
    control.isRange && control.values.every((value) => value === '') ? [] : control.values;
  // An empty selection is not an error: the viewer is asked for the value instead.
  if (control.mode !== 'exists' && values.length === 0) {
    return undefined;
  }
  if (control.mode !== 'include') {
    return invalid(
      i18n.translate('workflows.dashboardRunPanel.resolve.controlNotIncludeMode', {
        defaultMessage:
          'The {label} control {mode, select, exclude {excludes its selection} other {matches any value}}, so it cannot provide a value',
        values: { label: control.label, mode: control.mode },
      })
    );
  }
  return coerceValues(values, descriptor);
};

const resolveTime = (expression: string, roundUp: boolean, now: Date): Moment | undefined => {
  const parsed = dateMath.parse(expression, { roundUp, forceNow: now });
  return parsed?.isValid() ? parsed : undefined;
};

/** A `date` input takes the calendar day in the time zone the dashboard shows, not a timestamp. */
const formatTimeBound = (bound: Moment, descriptor: WorkflowInputDescriptor): string =>
  descriptor.kind === 'date' || descriptor.itemKind === 'date'
    ? bound.format('YYYY-MM-DD')
    : bound.toISOString();

const resolveTimeRange = (
  part: 'from' | 'to' | undefined,
  descriptor: WorkflowInputDescriptor,
  timeRange: TimeRange | undefined,
  now: Date
): Coerced => {
  if (!timeRange) {
    return invalid(
      i18n.translate('workflows.dashboardRunPanel.resolve.noTimeRange', {
        defaultMessage: 'The dashboard has no time range',
      })
    );
  }
  const from = resolveTime(timeRange.from, false, now);
  const to = resolveTime(timeRange.to, true, now);
  if (!from || !to) {
    return invalid(
      i18n.translate('workflows.dashboardRunPanel.resolve.invalidTimeRange', {
        defaultMessage: 'The dashboard time range "{from} to {to}" could not be resolved',
        values: { from: timeRange.from, to: timeRange.to },
      })
    );
  }
  if (part) {
    return coerceValues([formatTimeBound(part === 'from' ? from : to, descriptor)], descriptor);
  }
  if (
    descriptor.kind !== 'time_range' &&
    descriptor.kind !== 'object' &&
    descriptor.kind !== 'unknown'
  ) {
    return invalid(
      i18n.translate('workflows.dashboardRunPanel.resolve.timeRangeNeedsPart', {
        defaultMessage: 'Choose the start or the end of the time range for this input',
      })
    );
  }
  return {
    ok: true,
    value: {
      from: from.toISOString(),
      to: to.toISOString(),
      fromExpression: timeRange.from,
      toExpression: timeRange.to,
    },
  };
};

const resolveQuery = (
  context: DashboardRunContext,
  esQueryConfig: EsQueryConfig | undefined
): Coerced => {
  const { query, filters } = context;
  try {
    const compiledQuery = buildEsQuery(undefined, query ?? [], filters, esQueryConfig);
    return { ok: true, value: { ...(query ? { query } : {}), filters, compiledQuery } };
  } catch (error) {
    return invalid(
      i18n.translate('workflows.dashboardRunPanel.resolve.invalidQuery', {
        defaultMessage: 'The dashboard query could not be compiled: {message}',
        values: { message: error instanceof Error ? error.message : String(error) },
      })
    );
  }
};

const resolveConstant = (
  value: WorkflowRunConstantValue,
  descriptor: WorkflowInputDescriptor
): Coerced => coerceValues(Array.isArray(value) ? value : [value], descriptor);

const resolveMapping = (
  mapping: WorkflowRunInputMapping,
  descriptor: WorkflowInputDescriptor,
  context: DashboardRunContext,
  options: ResolveWorkflowInputsOptions
): Coerced | undefined => {
  switch (mapping.source) {
    case 'control':
      return resolveControl(mapping.control_id, descriptor, context.controls);
    case 'time_range':
      return resolveTimeRange(mapping.part, descriptor, context.timeRange, options.now);
    case 'query':
      return resolveQuery(context, options.esQueryConfig);
    case 'constant':
      return resolveConstant(mapping.value, descriptor);
  }
};

/**
 * Resolves the panel's input mappings against the dashboard state at the moment of the run.
 * Values that cannot be resolved are reported as issues and left for the viewer to fill in.
 */
export const resolveWorkflowInputs = (
  descriptors: WorkflowInputDescriptor[],
  mappings: readonly WorkflowRunInputMapping[],
  context: DashboardRunContext,
  options: ResolveWorkflowInputsOptions
): ResolvedWorkflowInputs => {
  const values: Record<string, unknown> = {};
  const issues: InputResolutionIssue[] = [];

  for (const mapping of mappings) {
    const descriptor = descriptors.find(({ name }) => name === mapping.input);
    const result: Coerced | undefined = descriptor
      ? resolveMapping(mapping, descriptor, context, options)
      : invalid(
          i18n.translate('workflows.dashboardRunPanel.resolve.inputRemoved', {
            defaultMessage: 'The workflow no longer has this input',
          })
        );
    if (result?.ok) {
      values[mapping.input] = result.value;
    } else if (result) {
      issues.push({ input: mapping.input, message: result.message });
    }
  }

  return { values, issues };
};
