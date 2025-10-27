/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, EuiFlyoutBody, EuiFlyoutFooter } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
import type { SearchSessionsMgmtAPI } from '../lib/api';
import { SearchSessionsMgmtTable } from '../components/table';
import type { SearchUsageCollector } from '../../../collectors';
import type { BackgroundSearchOpenedHandler, LocatorsStart, UISession } from '../types';
import { getColumns } from './get_columns';

export const Flyout = ({
  onClose,
  api,
  coreStart,
  usageCollector,
  config,
  kibanaVersion,
  locators,
  appId,
  onBackgroundSearchOpened,
  onOpenChildFlyout,
}: {
  onClose: () => void;
  api: SearchSessionsMgmtAPI;
  coreStart: CoreStart;
  usageCollector: SearchUsageCollector;
  config: SearchSessionsConfigSchema;
  kibanaVersion: string;
  locators: LocatorsStart;
  appId?: string;
  onBackgroundSearchOpened?: BackgroundSearchOpenedHandler;
  onOpenChildFlyout?: (session: UISession) => void;
}) => {
  const handleOpenChildFlyout = useCallback(
    (session: UISession) => {
      onOpenChildFlyout?.(session);
    },
    [onOpenChildFlyout]
  );

  return (
    <>
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
          getColumns={(props) =>
            getColumns({
              ...props,
              onInspectSession: handleOpenChildFlyout,
            })
          }
          appId={appId}
          onBackgroundSearchOpened={onBackgroundSearchOpened}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose} aria-label="Close background searches flyout">
          <FormattedMessage id="data.session_mgmt.close_flyout" defaultMessage="Close" />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </>
  );
};
