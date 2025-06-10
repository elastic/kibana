/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { type SavedSearchCasesAttachmentPersistedState } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { CasesPublicStartDependencies } from '@kbn/cases-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DISCOVER_APP_LOCATOR, type DiscoverAppLocatorParams } from '@kbn/discover-plugin/common'; // runtime requirement

export interface GoToDiscoverButtonProps {
  isIcon?: boolean;
  state: SavedSearchCasesAttachmentPersistedState;
}

const GoToDiscoverButtonComponent: React.FC<GoToDiscoverButtonProps> = ({ isIcon, state }) => {
  const {
    services: {
      share: { url: urlService },
      data: { dataViews: dataViewsService },
    },
  } = useKibana<CoreStart & CasesPublicStartDependencies>();
  const [dataView, setDataView] = React.useState<DataView | null>(null);

  const { index, timestampField, filters, query, timeRange } = state;

  const discoverLocator = urlService.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const redirectUrl = discoverLocator?.getRedirectUrl({
    dataViewSpec: dataView?.toSpec(),
    timeRange,
    filters,
    query,
    index,
    timestampField,
  });

  const buttonProps = {
    iconType: 'discoverApp',
    'aria-label': GO_TO_DISCOVER,
    href: redirectUrl,
    'data-test-subj': 'cases-files-go-to-discover-button',
  };

  useEffect(() => {
    const setAdHocDataView = async () => {
      if (dataView) return;
      const adHocDataView: DataView = await dataViewsService.create({
        title: index,
        timeFieldName: timestampField,
      });
      setDataView(adHocDataView);
    };
    setAdHocDataView();
  }, [dataView, index, timestampField, dataViewsService]);

  if (!dataView) {
    return null;
  }

  return isIcon ? (
    <EuiToolTip content={GO_TO_DISCOVER}>
      <EuiButtonIcon {...buttonProps} />
    </EuiToolTip>
  ) : (
    <EuiButtonEmpty {...buttonProps}>{GO_TO_DISCOVER}</EuiButtonEmpty>
  );
};

GoToDiscoverButtonComponent.displayName = 'GoToDiscoverButtonComponent';

export const GoToDiscoverButton = React.memo(GoToDiscoverButtonComponent);

const GO_TO_DISCOVER = i18n.translate('discover.cases.attachment.goToDiscoverButtonLabel', {
  defaultMessage: 'Go To Discover',
});
