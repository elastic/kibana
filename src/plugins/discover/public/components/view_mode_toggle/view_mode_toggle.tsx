/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiTabs, EuiTab, useEuiPaddingSize, EuiBetaBadge } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { VIEW_MODE } from './constants';
import { SHOW_FIELD_STATISTICS } from '../../../common';
import { useDiscoverServices } from '../../hooks/use_discover_services';

export const DocumentViewModeToggle = ({
  viewMode,
  setDiscoverViewMode,
}: {
  viewMode: VIEW_MODE;
  setDiscoverViewMode: (viewMode: VIEW_MODE) => void;
}) => {
  const { uiSettings } = useDiscoverServices();

  const tabsCss = css`
    padding: 0 ${useEuiPaddingSize('s')};
    background-color: ${euiThemeVars.euiPageBackgroundColor};
  `;

  const betaBadgeCss = css`
    vertical-align: middle;
  `;

  const showViewModeToggle = uiSettings.get(SHOW_FIELD_STATISTICS) ?? false;

  if (!showViewModeToggle) {
    return null;
  }

  return (
    <EuiTabs size="s" css={tabsCss} data-test-subj="dscViewModeToggle">
      <EuiTab
        isSelected={viewMode === VIEW_MODE.DOCUMENT_LEVEL}
        onClick={() => setDiscoverViewMode(VIEW_MODE.DOCUMENT_LEVEL)}
        className="dscViewModeToggle__tab"
        data-test-subj="dscViewModeDocumentButton"
      >
        <FormattedMessage id="discover.viewModes.document.label" defaultMessage="Documents" />
      </EuiTab>
      <EuiTab
        isSelected={viewMode === VIEW_MODE.AGGREGATED_LEVEL}
        onClick={() => setDiscoverViewMode(VIEW_MODE.AGGREGATED_LEVEL)}
        className="dscViewModeToggle__tab"
        data-test-subj="dscViewModeFieldStatsButton"
        append={
          <EuiBetaBadge
            label={i18n.translate('discover.viewModes.fieldStatistics.betaTitle', {
              defaultMessage: 'Beta',
            })}
            size="s"
            className="fieldStatsBetaBadge"
            css={betaBadgeCss}
          />
        }
      >
        <FormattedMessage
          id="discover.viewModes.fieldStatistics.label"
          defaultMessage="Field statistics"
        />
      </EuiTab>
    </EuiTabs>
  );
};
