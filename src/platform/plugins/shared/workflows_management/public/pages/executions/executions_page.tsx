/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPageTemplate, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { WorkflowExecutionsFilterSearchScaffold } from './workflow_executions_filter_search_scaffold';
import { WorkflowExecutionsStubDataGrid } from './workflow_executions_stub_data_grid';
import { useKibana } from '../../hooks/use_kibana';
import { useWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';

const executionsPageTitle = i18n.translate('workflowsManagement.executionsPage.pageTitle', {
  defaultMessage: 'Executions',
});

const executionsPageDescription = i18n.translate(
  'workflowsManagement.executionsPage.pageDescription',
  {
    defaultMessage:
      'Recent workflow executions for your space. Data below is static until the list is connected to Elasticsearch.',
  }
);

export function WorkflowExecutionsPage() {
  const services = useKibana().services;
  const { euiTheme } = useEuiTheme();

  useWorkflowsBreadcrumbs(executionsPageTitle);

  return (
    <EuiPageTemplate
      offset={0}
      css={{ backgroundColor: euiTheme.colors.backgroundBasePlain }}
      data-test-subj="workflowExecutionsPage"
    >
      <EuiPageTemplate.Header bottomBorder pageTitle={executionsPageTitle}>
        <EuiText size="s" color="subdued">
          <p>{executionsPageDescription}</p>
        </EuiText>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section paddingSize="m" grow>
        <EuiText size="xs" color="subdued">
          <p>
            <FormattedMessage
              id="workflowsManagement.executionsPage.stubDataHint"
              defaultMessage="Showing sample rows only — API integration will replace this table in a follow-up change."
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <WorkflowExecutionsFilterSearchScaffold />
        <EuiSpacer size="m" />
        <WorkflowExecutionsStubDataGrid services={services} />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
