import React from 'react';
import { EuiPageHeader, EuiPageTemplate } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';

export function WorkflowDetailPage({ id }: { id: string }) {
  const { application, chrome } = useKibana().services;

  chrome!.setBreadcrumbs([
    {
      text: i18n.translate('workflows.breadcrumbs.title', { defaultMessage: 'Workflows' }),
      href: application!.getUrlForApp('workflows', { path: '/' }),
    },
    { text: 'Workflow Detail' },
  ]);
  return (
    <EuiPageTemplate offset={0}>
      <EuiPageTemplate.Header>
        <EuiPageHeader pageTitle={'Workflow Detail'} />
      </EuiPageTemplate.Header>
    </EuiPageTemplate>
  );
}
