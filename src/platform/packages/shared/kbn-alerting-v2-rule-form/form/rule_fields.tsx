/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { FormValues } from './types';
import { RuleExecutionFieldGroup } from './field_groups/rule_execution_field_group';
import { RuleDetailsFieldGroup } from './field_groups/rule_details_field_group';
export interface RuleFieldsServices {
  http: HttpStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  core: CoreStart;
  storage: Storage;
  uiActions: UiActionsStart;
  fieldsMetadata?: FieldsMetadataPublicStart;
  usageCollection?: UsageCollectionStart;
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

  return (
    <>
      <RuleDetailsFieldGroup />
      <EuiSpacer size="m" />
      <RuleExecutionFieldGroup services={services} query={query} />
    </>
  );
};
