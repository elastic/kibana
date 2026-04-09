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
import type { UnavailabilityReason } from '../../common/lib/availability/availability_service';
import { useKibana } from '../../hooks/use_kibana';
import { useWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { AccessDenied } from '../access_denied/access_denied';

/**
 * Wrapper component to render the workflows app with the availability check
 */
export const WorkflowsAvailabilityWrapper = React.memo<PropsWithChildren>(({ children }) => {
  const { availability } = useKibana().services.workflowsManagement;

  const availability$ = useMemo(() => availability.getAvailabilityStatus$(), [availability]);
  const availabilityStatus = useObservable(availability$, availability.getAvailabilityStatus());

  if (!availabilityStatus.isAvailable) {
    return <AvailabilityAccessDenied reason={availabilityStatus.unavailabilityReason} />;
  }

  return <>{children}</>;
});
WorkflowsAvailabilityWrapper.displayName = 'WorkflowsAvailabilityWrapper';

/**
 * Component to render the access denied screen when the workflows app is not available
 * @param reason - The reason for the unavailability
 * @returns The access denied component
 */
const AvailabilityAccessDenied = React.memo<{ reason: UnavailabilityReason }>(({ reason }) => {
  useWorkflowsBreadcrumbs();
  const actions = useUnavailabilityActions(reason);
  return (
    <AccessDenied
      title={
        reason === 'license'
          ? i18n.translate('platform.plugins.shared.workflows_management.ui.upgradeLicense.title', {
              defaultMessage: 'Upgrade your license',
            })
          : i18n.translate(
              'platform.plugins.shared.workflows_management.ui.unavailableInServerlessTier.title',
              { defaultMessage: 'Upgrade your subscription' }
            )
      }
      description={
        reason === 'license' ? (
          <FormattedMessage
            id="platform.plugins.shared.workflows_management.ui.upgradeLicense.description"
            defaultMessage="You need an Enterprise license to use Workflows."
          />
        ) : (
          <FormattedMessage
            id="platform.plugins.shared.workflows_management.ui.unavailableInServerlessTier.description"
            defaultMessage="You need to upgrade the subscription of your serverless project to use Workflows."
          />
        )
      }
      actions={actions}
    />
  );
});
AvailabilityAccessDenied.displayName = 'AvailabilityAccessDenied';

const LICENSE_DOCS_LINK = 'https://www.elastic.co/subscriptions';

const useUnavailabilityActions = (reason: UnavailabilityReason): React.ReactNode[] => {
  const { application } = useKibana().services;
  if (reason === 'license') {
    return [
      <EuiButton fill href={LICENSE_DOCS_LINK} target="_blank">
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
    ];
  }
  return [
    // TODO: Add actions for unavailable in serverless tier
  ];
};
