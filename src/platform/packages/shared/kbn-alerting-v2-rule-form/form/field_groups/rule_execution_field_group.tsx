/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiIconTip } from '@elastic/eui';
import { Controller, type Control, type FieldErrors, type UseFormSetValue } from 'react-hook-form';
import type { HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FormValues } from '../types';
import { FieldGroup } from './field_group';
import { RuleSchedule } from '../fields/rule_schedule';
import { TimeFieldSelect } from '../fields/time_field_select';
import { LookbackWindow } from '../fields/lookback_window';
import { GroupBySelect } from '../fields/group_by_select';
import { useDataFields } from '../hooks/use_data_fields';
import { useQueryColumns } from '../hooks/use_query_columns';

interface RuleExecutionFieldGroupProps {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  services: {
    http: HttpStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
  };
  query: string;
}

const SCHEDULE_ROW_ID = 'ruleV2FormScheduleField';
const LOOKBACK_WINDOW_ROW_ID = 'ruleV2FormLookbackWindowField';

export const RuleExecutionFieldGroup: React.FC<RuleExecutionFieldGroupProps> = ({
  control,
  errors,
  setValue,
  query,
  services,
}) => {
  // Time fields come from the data view (used for filtering before query runs)
  const { fields: timeFields } = useDataFields({
    query,
    http: services.http,
    dataViews: services.dataViews,
  });
  // Columns come from the ES|QL query result (used for grouping)
  const { columns } = useQueryColumns({ query, search: services.data.search.search });
  return (
    <FieldGroup
      title={i18n.translate('xpack.esqlRuleForm.ruleExecution', {
        defaultMessage: 'Rule execution',
      })}
    >
      <EuiFormRow
        id={SCHEDULE_ROW_ID}
        label={i18n.translate('xpack.esqlRuleForm.scheduleLabel', {
          defaultMessage: 'Schedule',
        })}
        helpText={
          <>
            {i18n.translate('xpack.esqlRuleForm.scheduleHelpText', {
              defaultMessage: 'Set the frequency to check the alert conditions',
            })}
            &nbsp;
            <EuiIconTip
              position="right"
              type="question"
              content={i18n.translate('xpack.esqlRuleForm.scheduleTooltip', {
                defaultMessage:
                  'The frequency of how often the rule runs. This check can be delayed based on the Kibana polling frequency.',
              })}
            />
          </>
        }
        isInvalid={!!errors.schedule?.custom}
        error={errors.schedule?.custom?.message}
      >
        <Controller
          control={control}
          name="schedule.custom"
          render={({ field }) => <RuleSchedule {...field} />}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.esqlRuleForm.timeFieldLabel', {
          defaultMessage: 'Time Field',
        })}
        isInvalid={!!errors.timeField}
        error={errors.timeField?.message}
      >
        <Controller
          name="timeField"
          control={control}
          rules={{
            required: i18n.translate('xpack.esqlRuleForm.timeFieldRequiredError', {
              defaultMessage: 'Time field is required.',
            }),
          }}
          render={({ field }) => <TimeFieldSelect {...field} fields={timeFields} />}
        />
      </EuiFormRow>

      <EuiFormRow
        id={LOOKBACK_WINDOW_ROW_ID}
        label={i18n.translate('xpack.esqlRuleForm.lookbackWindowLabel', {
          defaultMessage: 'Lookback Window',
        })}
        isInvalid={!!errors.lookbackWindow}
        error={errors.lookbackWindow?.message}
      >
        <Controller
          control={control}
          name="lookbackWindow"
          render={({ field }) => <LookbackWindow {...field} />}
        />
      </EuiFormRow>

      <GroupBySelect control={control} columns={columns} setValue={setValue} />
    </FieldGroup>
  );
};
