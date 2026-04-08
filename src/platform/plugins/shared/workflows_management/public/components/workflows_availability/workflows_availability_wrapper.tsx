/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiButtonEmpty, EuiIcon } from '@elastic/eui';
import React, { type PropsWithChildren, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useObservable } from '@kbn/use-observable';
import { useKibana } from '../../hooks/use_kibana';
import { useWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { AccessDenied } from '../access_denied/access_denied';

export const WorkflowsAvailabilityWrapper = React.memo<PropsWithChildren>(({ children }) => {
  const { services } = useKibana();
  const license = useObservable(services.licensing.license$);

  if (!license?.hasAtLeast('enterprise')) {
    return <AvailabilityAccessDenied />;
  }

  return <>{children}</>;
});
WorkflowsAvailabilityWrapper.displayName = 'WorkflowsAvailabilityWrapper';

const SUBSCRIPTIONS_LINK = 'https://www.elastic.co/subscriptions';

const AvailabilityAccessDenied: React.FC = () => {
  useWorkflowsBreadcrumbs();
  const { application } = useKibana().services;

  const actions = useMemo(
    () => [
      <EuiButton fill href={SUBSCRIPTIONS_LINK} target="_blank">
        <FormattedMessage
          id="platform.plugins.shared.workflows_management.ui.upgradeLicense.subscriptionPlansButton"
          defaultMessage="Subscription plans"
        />
        <EuiIcon type="popout" aria-hidden={true} />
      </EuiButton>,
      // eslint-disable-next-line @elastic/eui/href-or-on-click
      <EuiButtonEmpty
        onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
          ev.preventDefault();
          application.navigateToApp('licenseManagement');
        }}
        href={application.getUrlForApp('licenseManagement')}
      >
        <FormattedMessage
          id="platform.plugins.shared.workflows_management.ui.upgradeLicense.manageLicenseButton"
          defaultMessage="Manage your license"
        />
      </EuiButtonEmpty>,
    ],
    [application]
  );

  return (
    <AccessDenied
      title={i18n.translate(
        'platform.plugins.shared.workflows_management.ui.upgradeLicense.title',
        { defaultMessage: 'Upgrade your license' }
      )}
      description={
        <FormattedMessage
          id="platform.plugins.shared.workflows_management.ui.upgradeLicense.description"
          defaultMessage="You need an Enterprise license to use Workflows."
        />
      }
      actions={actions}
    />
  );
};
