/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { useUpgradeAssistantStatus } from './use_upgrade_assistant_status';

const UA_MANAGEMENT_PATH = 'stack/upgrade_assistant';

export const UpgradeAssistantBanner = ({
  http,
  navigateToApp,
}: {
  http: HttpStart;
  navigateToApp: ApplicationStart['navigateToApp'];
}) => {
  const { isLoading, deprecationCount } = useUpgradeAssistantStatus(http);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      navigateToApp('management', { path: UA_MANAGEMENT_PATH });
    },
    [navigateToApp]
  );

  if (isLoading || deprecationCount === 0) {
    return null;
  }

  return (
    <EuiCallOut
      color="warning"
      iconType="sortUp"
      data-test-subj="managementUpgradeAssistantBanner"
      title={
        <EuiLink
          onClick={handleClick}
          color="warning"
          data-test-subj="managementUpgradeAssistantLink"
        >
          <FormattedMessage
            id="management.landing.quickActions.upgradeAssistant"
            defaultMessage="Upgrade Assistant — {count} {count, plural, one {deprecation warning} other {deprecation warnings}} to review"
            values={{ count: deprecationCount }}
          />
        </EuiLink>
      }
      size="s"
    />
  );
};
