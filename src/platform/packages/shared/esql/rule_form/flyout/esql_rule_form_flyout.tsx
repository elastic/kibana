/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { NotificationsStart } from '@kbn/core/public';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFieldText,
  EuiButton,
  EuiForm,
  EuiFormRow,
  EuiFlyoutHeader,
  EuiTitle,
  EuiIconTip,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiComboBox,
  EuiSpacer,
} from '@elastic/eui';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useForm, Controller } from 'react-hook-form';
import type { HttpStart } from '@kbn/core/public';
import type { FormValues } from './types';
import { RuleSchedule } from './fields/rule_schedule';
import { LookbackWindow } from './fields/lookback_window';
import { TimeFieldSelect } from './fields/time_field_select';
import { GroupBySelect } from './fields/group_by_select';
import { FieldGroup } from './fields/field_group';
import { ErrorCallOut } from './error_callout';
import { useCreateRule } from './hooks/use_create_rule';
import { useDataFields } from './hooks/use_data_fields';

interface ESQLRuleFormFlyoutProps {
  push?: boolean;
  onClose?: () => void;
  services: {
    http: HttpStart;
    dataViews: DataViewsPublicPluginStart;
    notifications: NotificationsStart;
  };
  query: string;
  defaultTimeField?: string;
  isQueryInvalid?: boolean;
}

const ESQLRuleFormFlyoutComponent: React.FC<ESQLRuleFormFlyoutProps> = ({
  push = true,
  onClose,
  query,
  defaultTimeField,
  services,
  isQueryInvalid,
}) => {
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitted },
  } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: {
      schedule: {
        custom: '5m',
      },
      lookbackWindow: '5m',
      timeField: defaultTimeField,
    },
  });
  const { http, dataViews, notifications } = services;
  const flyoutTitleId = 'ruleV2FormFlyoutTitle';
  const formId = 'ruleV2Form';
  const nameRowId = 'ruleV2FormNameField';
  const scheduleRowId = 'ruleV2FormScheduleField';
  const lookbackWindowRowId = 'ruleV2FormLookbackWindowField';
  const { fields } = useDataFields({ query, http, dataViews });

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const onSubmit = (data: FormValues) => {
    createRule(data);
  };

  const { createRule, isLoading } = useCreateRule({
    http,
    notifications,
    onSuccess: handleClose,
  });

  useEffect(() => {
    setValue('query', query);
  }, [query, setValue]);

  return (
    <EuiForm id={formId} component="form" onSubmit={handleSubmit(onSubmit)}>
      <EuiFlyout
        type={push ? 'push' : 'overlay'}
        onClose={handleClose}
        aria-labelledby={flyoutTitleId}
        size="s"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m" id={flyoutTitleId}>
            <h2>
              <FormattedMessage
                id="xpack.esqlRuleForm.flyoutTitle"
                defaultMessage="Create Alert Rule"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <ErrorCallOut
            errors={errors}
            isSubmitted={isSubmitted}
            isQueryInvalid={isQueryInvalid}
            setError={setError}
          />
          <FieldGroup
            title={i18n.translate('xpack.esqlRuleForm.ruleDetails', {
              defaultMessage: 'Rule details',
            })}
          >
            <EuiFormRow
              id={nameRowId}
              label={i18n.translate('xpack.esqlRuleForm.nameLabel', {
                defaultMessage: 'Name',
              })}
              isInvalid={!!errors.name}
              error={errors.name?.message}
            >
              <Controller
                name="name"
                control={control}
                rules={{
                  required: i18n.translate('xpack.esqlRuleForm.nameRequiredError', {
                    defaultMessage: 'Name is required.',
                  }),
                }}
                render={({ field: { ref, ...field } }) => (
                  <EuiFieldText {...field} inputRef={ref} />
                )}
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.esqlRuleForm.tagsLabel', {
                defaultMessage: 'Tags',
              })}
            >
              <Controller
                name="tags"
                control={control}
                render={({ field }) => {
                  const selectedOptions = (field.value ?? []).map((val) => ({ label: val }));
                  const options = selectedOptions; // For tags, the options are the selected values

                  return (
                    <EuiComboBox
                      options={options}
                      selectedOptions={selectedOptions}
                      onChange={(selected) => field.onChange(selected.map(({ label }) => label))}
                      onCreateOption={(searchValue) => {
                        field.onChange([...(field.value ?? []), searchValue]);
                      }}
                      isClearable={true}
                    />
                  );
                }}
              />
            </EuiFormRow>
          </FieldGroup>
          <EuiSpacer size="m" />
          <FieldGroup
            title={i18n.translate('xpack.esqlRuleForm.ruleExecution', {
              defaultMessage: 'Rule execution',
            })}
          >
            <EuiFormRow
              id={scheduleRowId}
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
            >
              <Controller
                name="timeField"
                control={control}
                render={({ field }) => <TimeFieldSelect {...field} fields={fields} />}
              />
            </EuiFormRow>
            <EuiFormRow
              id={lookbackWindowRowId}
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
            <GroupBySelect control={control} fields={fields} />
          </FieldGroup>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} isLoading={isLoading}>
                <FormattedMessage
                  id="xpack.esqlRuleForm.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton type="submit" fill isLoading={isLoading} aria-controls={formId}>
                <FormattedMessage id="xpack.esqlRuleForm.saveButtonLabel" defaultMessage="Save" />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiForm>
  );
};

export const ESQLRuleFormFlyout: React.FC<ESQLRuleFormFlyoutProps> = (props) => {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <ESQLRuleFormFlyoutComponent {...props} />
    </QueryClientProvider>
  );
};
