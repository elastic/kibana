/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useEffect, type ReactElement } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { isLegacyTableEnabled, SHOW_FIELD_STATISTICS } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { VIEW_MODE } from '../../../common/constants';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { DiscoverStateContainer } from '../../application/main/state_management/discover_state';
import { HitsCounter, HitsCounterMode } from '../hits_counter';

export const DocumentViewModeToggle = ({
  viewMode,
  isTextBasedQuery,
  prepend,
  stateContainer,
  setDiscoverViewMode,
  patternCount,
  dataView,
}: {
  viewMode: VIEW_MODE;
  isTextBasedQuery: boolean;
  prepend?: ReactElement;
  stateContainer: DiscoverStateContainer;
  setDiscoverViewMode: (viewMode: VIEW_MODE) => void;
  patternCount?: number;
  dataView: DataView;
}) => {
  const { euiTheme } = useEuiTheme();
  const { uiSettings } = useDiscoverServices();
  const isLegacy = useMemo(
    () => isLegacyTableEnabled({ uiSettings, isTextBasedQueryMode: isTextBasedQuery }),
    [uiSettings, isTextBasedQuery]
  );

  const showPatternAnalysisTab = useMemo(
    () => dataView.fields.some((f) => f.esTypes?.includes(ES_FIELD_TYPES.TEXT)),
    [dataView.fields]
  );

  useEffect(() => {
    if (showPatternAnalysisTab === false && viewMode === VIEW_MODE.PATTERN_LEVEL) {
      // switch to document view if no text fields are available
      setDiscoverViewMode(VIEW_MODE.DOCUMENT_LEVEL);
    }
  }, [showPatternAnalysisTab, viewMode, setDiscoverViewMode]);

  const includesNormalTabsStyle =
    viewMode === VIEW_MODE.AGGREGATED_LEVEL || viewMode === VIEW_MODE.PATTERN_LEVEL || isLegacy;

  const containerPadding = includesNormalTabsStyle ? euiTheme.size.s : 0;
  const containerCss = css`
    padding: ${containerPadding} ${containerPadding} 0 ${containerPadding};
  `;

  const tabsCss = css`
    .euiTab__content {
      line-height: ${euiTheme.size.xl};
    }
  `;

  const showViewModeToggle = uiSettings.get(SHOW_FIELD_STATISTICS) ?? false;

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      alignItems="center"
      responsive={false}
      css={containerCss}
    >
      {prepend && (
        <EuiFlexItem
          grow={false}
          css={css`
            &:empty {
              display: none;
            }
          `}
        >
          {prepend}
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        {isTextBasedQuery || !showViewModeToggle ? (
          <HitsCounter mode={HitsCounterMode.standalone} stateContainer={stateContainer} />
        ) : (
          <EuiTabs size="m" css={tabsCss} data-test-subj="dscViewModeToggle" bottomBorder={false}>
            <EuiTab
              isSelected={viewMode === VIEW_MODE.DOCUMENT_LEVEL}
              onClick={() => setDiscoverViewMode(VIEW_MODE.DOCUMENT_LEVEL)}
              data-test-subj="dscViewModeDocumentButton"
            >
              <FormattedMessage id="discover.viewModes.document.label" defaultMessage="Documents" />
              <HitsCounter mode={HitsCounterMode.appended} stateContainer={stateContainer} />
            </EuiTab>

            {showPatternAnalysisTab ? (
              <EuiTab
                isSelected={viewMode === VIEW_MODE.PATTERN_LEVEL}
                onClick={() => setDiscoverViewMode(VIEW_MODE.PATTERN_LEVEL)}
                data-test-subj="dscViewModePatternAnalysisButton"
              >
                <FormattedMessage
                  id="discover.viewModes.patternAnalysis.label"
                  defaultMessage="Patterns {patternCount}"
                  values={{ patternCount: patternCount !== undefined ? ` (${patternCount})` : '' }}
                />
              </EuiTab>
            ) : null}

            <EuiTab
              isSelected={viewMode === VIEW_MODE.AGGREGATED_LEVEL}
              onClick={() => setDiscoverViewMode(VIEW_MODE.AGGREGATED_LEVEL)}
              data-test-subj="dscViewModeFieldStatsButton"
            >
              <FormattedMessage
                id="discover.viewModes.fieldStatistics.label"
                defaultMessage="Field statistics"
              />
            </EuiTab>
          </EuiTabs>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
