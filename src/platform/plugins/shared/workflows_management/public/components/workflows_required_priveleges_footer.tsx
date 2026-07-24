/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

interface PermissionBadge {
  id: string;
  default: string;
}

export const PrivilegesFooter = ({ permissions }: { permissions: PermissionBadge[] }) => (
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
    {permissions.map((perm) => (
      <EuiFlexItem grow={false} key={perm.id}>
        <EuiBadge color="hollow">
          <FormattedMessage id={perm.id} defaultMessage={perm.default} />
        </EuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
