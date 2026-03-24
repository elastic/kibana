/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBetaBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
import type { SearchSessionsMgmtAPI } from '../lib/api';
import { SearchSessionsMgmtTable } from '../components/table';
import type { SearchUsageCollector } from '../../../collectors';
import type { BackgroundSearchOpenedHandler, LocatorsStart } from '../types';
import { getColumns } from './get_columns';
import type { ISearchSessionEBTManager } from '../../ebt_manager';

export const Flyout = ({
  flyoutId,
  api,
  coreStart,
  usageCollector,
  ebtManager,
  config,
  kibanaVersion,
  locators,
  appId,
  trackingProps,
  onBackgroundSearchOpened,
  onClose,
}: {
  flyoutId: string;
  api: SearchSessionsMgmtAPI;
  coreStart: CoreStart;
  usageCollector: SearchUsageCollector;
  ebtManager: ISearchSessionEBTManager;
  config: SearchSessionsConfigSchema;
  kibanaVersion: string;
  locators: LocatorsStart;
  appId?: string;
  trackingProps: { openedFrom: string };
  onBackgroundSearchOpened?: BackgroundSearchOpenedHandler;
  onClose: () => void;
}) => {
  const technicalPreviewLabel = i18n.translate('data.session_mgmt.technical_preview_label', {
    defaultMessage: 'Technical preview',
  });

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center">
          <EuiTitle id={flyoutId} size="m">
            <h1>
              <FormattedMessage
                id="data.session_mgmt.flyout_title"
                defaultMessage="Background searches"
              />
            </h1>
          </EuiTitle>
          <EuiBetaBadge label={technicalPreviewLabel}>{technicalPreviewLabel}</EuiBetaBadge>
        </EuiFlexGroup>
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
          appId={appId}
          onBackgroundSearchOpened={onBackgroundSearchOpened}
          searchSessionEBTManager={ebtManager}
          trackingProps={{ openedFrom: trackingProps.openedFrom, renderedIn: 'flyout' }}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose}>
          <FormattedMessage id="data.session_mgmt.close_flyout" defaultMessage="Close" />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </>
  );
};
