import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPageTemplate, EuiPageHeader } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { WorkflowList } from '../../features/workflow-list/ui';
import { useWorkflows } from '../../entities/workflows/model/useWorkflows';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export function WorkflowsPage() {
  const { refresh } = useWorkflows();

  const { application, chrome } = useKibana().services;

  chrome!.setBreadcrumbs([
    {
      text: i18n.translate('workflows.breadcrumbs.title', { defaultMessage: 'Workflows' }),
      href: application!.getUrlForApp('workflows', { path: '/' }),
    },
  ]);

  return (
    <EuiPageTemplate offset={0}>
      <EuiPageTemplate.Header>
        <EuiFlexGroup justifyContent={'spaceBetween'}>
          <EuiFlexItem>
            <EuiPageHeader
              pageTitle={
                <FormattedMessage id="workflows.pageTitle" defaultMessage="Workflows" ignoreTag />
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiButton color="text" size="s" onClick={() => refresh()}>
                <FormattedMessage id="workflows.buttonText" defaultMessage="Refresh" ignoreTag />
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        <WorkflowList />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
