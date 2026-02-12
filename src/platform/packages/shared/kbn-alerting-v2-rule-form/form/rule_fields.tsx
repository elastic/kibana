/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSpacer, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FormValues } from './types';
import { RuleExecutionFieldGroup } from './field_groups/rule_execution_field_group';
import { RuleDetailsFieldGroup } from './field_groups/rule_details_field_group';
import { KindField } from './fields/kind_field';

export interface RuleFieldsServices {
  http: HttpStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export interface RuleFieldsProps {
  services: RuleFieldsServices;
  query: string;
}

export const RuleFields: React.FC<RuleFieldsProps> = ({ services, query }) => {
  const formContext = useFormContext<FormValues>();

  if (!formContext) {
    throw new Error(
      'RuleFields must be used within a FormProvider. ' +
        'If using RuleFields standalone, wrap it with FormProvider from react-hook-form.'
    );
  }

  const { control } = formContext;

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.esqlRuleForm.kindLabel', {
          defaultMessage: 'Rule kind',
        })}
        helpText={i18n.translate('xpack.esqlRuleForm.kindHelpText', {
          defaultMessage: 'Choose whether this rule creates monitors or alerts.',
        })}
      >
        <Controller
          name="kind"
          control={control}
          render={({ field }) => <KindField {...field} />}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <RuleDetailsFieldGroup />
      <EuiSpacer size="m" />
      <EuiSpacer size="m" />
      <RuleExecutionFieldGroup services={services} query={query} />
    </>
  );
};
