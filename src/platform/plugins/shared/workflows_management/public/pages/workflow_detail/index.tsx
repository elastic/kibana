import React from 'react';
import { EuiLoadingSpinner, EuiPageHeader, EuiPageTemplate, EuiText } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { useWorkflowDetail } from '../../entities/workflows/model/useWorkflowDetail';

export function WorkflowDetailPage({ id }: { id: string }) {
  const { application, chrome } = useKibana().services;
  const { data: workflow, isLoading: isLoadingWorkflow, error } = useWorkflowDetail(id);

  chrome!.setBreadcrumbs([
    {
      text: i18n.translate('workflows.breadcrumbs.title', { defaultMessage: 'Workflows' }),
      href: application!.getUrlForApp('workflows', { path: '/' }),
    },
    { text: workflow?.name ?? 'Workflow Detail' },
  ]);

  if (isLoadingWorkflow) {
    return <EuiLoadingSpinner />;
  }

  if (error) {
    return <EuiText>Error loading workflow</EuiText>;
  }

  return (
    <EuiPageTemplate offset={0}>
      <EuiPageTemplate.Header>
        <EuiPageHeader pageTitle={workflow?.name ?? 'Workflow Detail'} />
      </EuiPageTemplate.Header>
    </EuiPageTemplate>
  );
}
