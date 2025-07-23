/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { CoreStart } from '@kbn/core/public';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { SearchSessionsMgmtTable } from '../components/table';
import { SearchUsageCollector } from '../../../collectors';
import { LocatorsStart } from '../types';

export const Flyout = ({
  onClose,
  api,
  coreStart,
  usageCollector,
  config,
  kibanaVersion,
  locators,
}: {
  onClose: () => void;
  api: SearchSessionsMgmtAPI;
  coreStart: CoreStart;
  usageCollector: SearchUsageCollector;
  config: SearchSessionsConfigSchema;
  kibanaVersion: string;
  locators: LocatorsStart;
}) => {
  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <FormattedMessage id="session_mgmt.flyout" defaultMessage="Background searches" />
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SearchSessionsMgmtTable
          core={coreStart}
          api={api}
          timezone={coreStart.uiSettings.get('dateFormat:tz')}
          config={config}
          kibanaVersion={kibanaVersion}
          searchUsageCollector={usageCollector}
          locators={locators}
          columns={['name', 'status', 'actions']}
          actions={['extend', 'rename', 'delete']}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
