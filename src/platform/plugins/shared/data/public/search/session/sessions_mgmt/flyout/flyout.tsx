/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { CoreStart } from '@kbn/core/public';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { SearchSessionsMgmtTable } from '../components/table';
import { SearchUsageCollector } from '../../../collectors';
import { LocatorsStart } from '../types';
import { getColumns } from './get_columns';

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
  const flyoutId = useGeneratedHtmlId();

  return (
    <EuiFlyout size="s" aria-labelledby={flyoutId} onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle id={flyoutId} size="m">
          <h1>
            <FormattedMessage
              id="data.session_mgmt.flyout_title"
              defaultMessage="Background searches"
            />
          </h1>
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
          hideRefreshButton
          getColumns={getColumns}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose}>
          <FormattedMessage id="data.session_mgmt.close_flyout" defaultMessage="Close" />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
