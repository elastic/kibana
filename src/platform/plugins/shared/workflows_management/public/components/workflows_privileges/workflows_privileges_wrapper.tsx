/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
<<<<<<< HEAD
=======
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
>>>>>>> 9.4
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { useTelemetry } from '../../hooks/use_telemetry';
import { useWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';
import { AccessDenied } from '../access_denied/access_denied';
<<<<<<< HEAD
import { PrivilegesFooter } from '../workflows_required_priveleges_footer';
=======
>>>>>>> 9.4

export const WorkflowsPrivilegesWrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { canReadWorkflow } = useWorkflowsCapabilities();

  if (!canReadWorkflow) {
    return <PrivilegesAccessDenied />;
  }
  return children;
};

const PrivilegesAccessDenied = () => {
  useWorkflowsBreadcrumbs();
  const telemetry = useTelemetry();

  useEffect(() => {
    telemetry.reportWorkflowAccessDeniedPrivileges();
  }, [telemetry]);

  return (
    <AccessDenied
      title={i18n.translate('platform.plugins.shared.workflows_management.ui.noReadAccess.title', {
        defaultMessage: 'Contact your administrator for access',
      })}
      description={
        <FormattedMessage
          id="platform.plugins.shared.workflows_management.ui.noReadAccess.description"
          defaultMessage="To view workflows in this space, you need additional privileges."
        />
      }
<<<<<<< HEAD
      footer={
        <PrivilegesFooter
          permissions={[
            {
              id: 'platform.plugins.shared.workflows_management.readWorkflowPermissionText',
              default: 'Workflows: Read',
            },
          ]}
        />
      }
    />
  );
};
=======
      footer={<PrivilegesFooter />}
    />
  );
};

const PrivilegesFooter = () => (
  <EuiFlexGroup
    gutterSize="s"
    wrap
    direction="column"
    justifyContent="center"
    responsive={false}
    alignItems="center"
  >
    <EuiFlexItem>
      <EuiText color="subdued" textAlign="center" size="xs">
        <p css={{ marginBlock: 0 }}>
          <FormattedMessage
            id="platform.plugins.shared.workflows_management.ui.noReadAccess.requiredPrivileges"
            defaultMessage="Minimum privileges required:"
          />
        </p>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge color="hollow">
        <FormattedMessage
          id="platform.plugins.shared.workflows_management.readWorkflowPermissionText"
          defaultMessage="Workflows: Read"
        />
      </EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);
>>>>>>> 9.4
