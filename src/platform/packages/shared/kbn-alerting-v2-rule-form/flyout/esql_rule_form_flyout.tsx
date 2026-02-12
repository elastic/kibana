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
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiButton,
  EuiForm,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useForm } from 'react-hook-form';
import type { HttpStart } from '@kbn/core/public';
import type { FormValues } from '../form/types';
import { ErrorCallOut } from './error_callout';
import { useCreateRule } from '../form/hooks/use_create_rule';
import { useDefaultGroupBy } from '../form/hooks/use_default_group_by';
import { RuleFields } from '../form/rule_fields';

export interface ESQLRuleFormFlyoutProps {
  push?: boolean;
  onClose?: () => void;
  services: {
    http: HttpStart;
    data: DataPublicPluginStart;
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
    clearErrors,
    formState: { errors, isSubmitted },
  } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: {
      kind: 'alert',
      name: '',
      description: '',
      tags: [],
      schedule: {
        custom: '5m',
      },
      lookbackWindow: '5m',
      timeField: defaultTimeField,
      enabled: true,
      groupingKey: [],
    },
  });
  const { http, notifications } = services;

  const flyoutTitleId = 'ruleV2FormFlyoutTitle';
  const formId = 'ruleV2Form';

  // Extract default grouping from the query's STATS ... BY clause
  const { defaultGroupBy } = useDefaultGroupBy({ query });

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const { createRule, isLoading } = useCreateRule({
    http,
    notifications,
    onSuccess: handleClose,
  });

  const onSubmit = (values: FormValues) => {
    createRule(values);
  };

  useEffect(() => {
    setValue('query', query);
    // Set default grouping from query's BY clause if available
    if (defaultGroupBy.length > 0) {
      setValue('groupingKey', defaultGroupBy);
    }
  }, [query, defaultGroupBy, setValue]);

  // Handle query validation errors from the parent (e.g., Discover)
  useEffect(() => {
    if (isQueryInvalid) {
      setError('query', {
        type: 'manual',
        message: i18n.translate('xpack.esqlRuleForm.invalidQueryError', {
          defaultMessage:
            'The ESQL query resulted in an error. Please review the query before saving the rule.',
        }),
      });
    } else {
      clearErrors('query');
    }
  }, [isQueryInvalid, setError, clearErrors]);

  return (
    <EuiForm id={formId} component="form" onSubmit={handleSubmit(onSubmit)}>
      <EuiFlyout
        session="start"
        flyoutMenuProps={{
          title: 'Create Alert Rule',
          hideTitle: true,
        }}
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
          <ErrorCallOut errors={errors} isSubmitted={isSubmitted} />
          <RuleFields
            control={control}
            errors={errors}
            setValue={setValue}
            query={query}
            services={services}
          />
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
              <EuiButton fill isLoading={isLoading} form={formId} type="submit">
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
  const [queryClient] = useMemo(() => new QueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <ESQLRuleFormFlyoutComponent {...props} />
    </QueryClientProvider>
  );
};
