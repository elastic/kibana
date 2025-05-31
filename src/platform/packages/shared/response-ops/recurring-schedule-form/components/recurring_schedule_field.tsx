/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { FormProps } from '@kbn/alerting-plugin/public/pages/maintenance_windows/components/schema';
import { RecurringScheduleForm } from './recurring_schedule_form';
import type { RecurringSchedule } from '../types';

export interface RecurringScheduleFieldProps {
  path?: string;
  startDate?: string;
  endDate?: string;
  timezone: string[];
  hideTimezone?: boolean;
  readOnly?: boolean;
  allowInfiniteRecurrence?: boolean;
}

/**
 * An adapter to use the recurring schedule form inside other `hook_form_lib` forms
 *
 * Define an empty field in your form schema
 * ```tsx
 * const schema = {
 *   recurringField: {},
 * };
 * ```
 * and use the RecurringScheduleField component with a `path` corresponding to the field name
 * ```tsx
 * <RecurringScheduleField path="recurringField" />
 * ```
 */
export const RecurringScheduleField = memo(
  ({
    path = 'recurringSchedule',
    startDate,
    endDate,
    timezone,
    hideTimezone,
    allowInfiniteRecurrence = true,
    readOnly = false,
  }: RecurringScheduleFieldProps) => {
    return (
      <UseField<RecurringSchedule, FormProps> path={path}>
        {({ value, setValue, setErrors }) => (
          <RecurringScheduleForm
            recurringSchedule={value}
            onRecurringScheduleChange={setValue}
            onErrorsChange={(errors) => {
              setErrors(errors.map((message) => ({ path, message })));
            }}
            startDate={startDate}
            endDate={endDate}
            timezone={timezone}
            hideTimezone={hideTimezone}
            readOnly={readOnly}
            allowInfiniteRecurrence={allowInfiniteRecurrence}
          />
        )}
      </UseField>
    );
  }
);

RecurringScheduleField.displayName = 'RecurringScheduleField';
