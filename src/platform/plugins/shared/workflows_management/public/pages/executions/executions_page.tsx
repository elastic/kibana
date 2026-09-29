/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPageTemplate, EuiScreenReaderOnly, useEuiTheme } from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBadge } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { WorkflowExecutionsPageContent } from './workflow_executions_page_content';
import { useTelemetry } from '../../hooks/use_telemetry';
import { useWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';

const executionsPageTitle = i18n.translate('workflowsManagement.executionsPage.pageTitle', {
  defaultMessage: 'Executions',
});

const executionsPageExperimentalBadgeLabel = i18n.translate(
  'workflowsManagement.executionsPage.experimentalBadge',
  {
    defaultMessage: 'EXPERIMENTAL',
  }
);

export function WorkflowExecutionsPage() {
  const { euiTheme } = useEuiTheme();
  const telemetry = useTelemetry();

  useWorkflowsBreadcrumbs(executionsPageTitle);

  const headerBadges = useMemo<AppHeaderBadge[]>(
    () => [
      {
        label: executionsPageExperimentalBadgeLabel,
        color: 'hollow',
        'data-test-subj': 'workflowExecutionsExperimentalBadge',
      },
    ],
    []
  );

  useEffect(() => {
    telemetry.reportWorkflowExecutionsPageViewed();
  }, [telemetry]);

  return (
    <EuiPageTemplate
      offset={0}
      css={{ backgroundColor: euiTheme.colors.backgroundBasePlain }}
      data-test-subj="workflowExecutionsPage"
    >
      <AppHeader title={executionsPageTitle} badges={headerBadges} />
      <EuiScreenReaderOnly>
        <h2 id="workflowExecutionsTableLabel">{executionsPageTitle}</h2>
      </EuiScreenReaderOnly>
      <EuiPageTemplate.Section paddingSize="m" grow restrictWidth={false}>
        <WorkflowExecutionsPageContent />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
